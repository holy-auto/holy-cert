import { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  TextInput,
  Button,
  HelperText,
  Text,
  Card,
  Searchbar,
  List,
  ActivityIndicator,
  Snackbar,
  Icon,
} from "react-native-paper";
import { router, Stack } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { mobileApi } from "@/lib/api";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface OcrResult {
  maker: string | null;
  model: string | null;
  year: number | null;
  vin_code: string | null;
  plate_display: string | null;
  size_class: string | null;
}

export default function VehicleNewScreen() {
  const { user, selectedStore } = useAuthStore();
  const queryClient = useQueryClient();
  const isPaidPlan = user?.planTier === "standard" || user?.planTier === "pro";

  const [form, setForm] = useState({
    maker: "",
    model: "",
    year: "",
    plate_display: "",
    vin_code: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 顧客選択
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState("");

  // 顧客検索
  const { data: customers = [], isFetching: searchingCustomers } = useQuery<Customer[]>({
    queryKey: ["customers-search-vehicle", customerSearch],
    queryFn: async () => {
      if (!customerSearch || customerSearch.length < 2) return [];
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("tenant_id", user!.tenantId)
        .ilike("name", `%${customerSearch}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
    enabled: customerSearch.length >= 2 && !selectedCustomer,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          tenant_id: user!.tenantId,
          maker: form.maker.trim() || null,
          model: form.model.trim() || null,
          year: form.year.trim() ? parseInt(form.year.trim(), 10) : null,
          plate_display: form.plate_display.trim() || null,
          vin_code: form.vin_code.trim() || null,
          customer_id: selectedCustomer?.id ?? null,
          customer_name: selectedCustomer?.name ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      router.replace(`/vehicles/${data.id}`);
    },
    onError: (err) => {
      setSnackbar(err instanceof Error ? err.message : "登録に失敗しました");
    },
  });

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.plate_display.trim()) e.plate_display = "ナンバーは必須です";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    mutation.mutate();
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleOcrScan() {
    const permResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permResult.granted) {
      setSnackbar("カメラの使用を許可してください");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setOcrImage(asset.uri);
    setOcrLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: "image/jpeg",
        name: "shakken.jpg",
      } as unknown as Blob);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const apiBase = process.env.EXPO_PUBLIC_API_URL!;
      const response = await fetch(
        `${apiBase.replace("/api/mobile", "")}/api/vehicles/parse-shakken`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );
      const res = (await response.json()) as { ok: boolean; extracted: OcrResult };

      if (res.ok && res.extracted) {
        const e = res.extracted;
        setForm((prev) => ({
          maker: e.maker ?? prev.maker,
          model: e.model ?? prev.model,
          year: e.year != null ? String(e.year) : prev.year,
          plate_display: e.plate_display ?? prev.plate_display,
          vin_code: e.vin_code ?? prev.vin_code,
        }));
        setSnackbar("車検証から情報を読み取りました");
      } else {
        setSnackbar("車検証を読み取れませんでした");
      }
    } catch (err) {
      setSnackbar(
        err instanceof Error ? err.message : "OCR処理に失敗しました",
      );
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "車両登録" }} />
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* 車検証OCR（有料プランのみ） */}
        {isPaidPlan && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <View style={styles.ocrHeader}>
                <Icon source="camera" size={20} color="#1a1a2e" />
                <Text variant="titleMedium" style={styles.heading}>
                  車検証スキャン
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.subText}>
                車検証を撮影して自動入力
              </Text>

              {ocrImage && (
                <Image
                  source={{ uri: ocrImage }}
                  style={styles.ocrPreview}
                  resizeMode="cover"
                />
              )}

              <Button
                mode="contained-tonal"
                icon="camera"
                onPress={handleOcrScan}
                loading={ocrLoading}
                disabled={ocrLoading}
                style={styles.ocrButton}
              >
                {ocrLoading ? "読み取り中..." : "車検証を撮影"}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* オーナー選択 */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>
              オーナー
            </Text>
            {selectedCustomer ? (
              <View style={styles.selectedRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge" style={{ fontWeight: "600" }}>
                    {selectedCustomer.name}
                  </Text>
                  {selectedCustomer.phone && (
                    <Text variant="bodySmall" style={styles.subText}>
                      {selectedCustomer.phone}
                    </Text>
                  )}
                </View>
                <Button
                  mode="text"
                  onPress={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch("");
                  }}
                >
                  変更
                </Button>
              </View>
            ) : (
              <>
                <Searchbar
                  placeholder="顧客名で検索..."
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  loading={searchingCustomers}
                  style={styles.searchbar}
                />
                {customers.map((c) => (
                  <List.Item
                    key={c.id}
                    title={c.name}
                    description={c.phone ?? ""}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch(c.name);
                    }}
                    left={(props) => <List.Icon {...props} icon="account" />}
                  />
                ))}
                <Text variant="bodySmall" style={[styles.subText, { marginTop: 8 }]}>
                  未選択の場合はオーナーなしで登録します
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* 車両情報フォーム */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>
              車両情報
            </Text>

            <TextInput
              label="メーカー"
              value={form.maker}
              onChangeText={(v) => update("maker", v)}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="車種"
              value={form.model}
              onChangeText={(v) => update("model", v)}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="年式"
              value={form.year}
              onChangeText={(v) => update("year", v)}
              mode="outlined"
              keyboardType="number-pad"
              style={styles.input}
            />

            <TextInput
              label="ナンバー *"
              value={form.plate_display}
              onChangeText={(v) => update("plate_display", v)}
              mode="outlined"
              error={!!errors.plate_display}
              style={styles.input}
            />
            {errors.plate_display && (
              <HelperText type="error">{errors.plate_display}</HelperText>
            )}

            <TextInput
              label="車台番号"
              value={form.vin_code}
              onChangeText={(v) => update("vin_code", v)}
              mode="outlined"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* 登録ボタン */}
        <View style={styles.submitArea}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            buttonColor="#1a1a2e"
            style={styles.submitButton}
            icon="check"
          >
            登録する
          </Button>
        </View>

        {mutation.isError && (
          <HelperText type="error" style={styles.errorText}>
            登録に失敗しました: {mutation.error.message}
          </HelperText>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar("")}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  card: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#ffffff" },
  heading: { fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  subText: { color: "#71717a", marginTop: 2 },
  ocrHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  ocrPreview: { width: "100%", height: 160, borderRadius: 8, marginTop: 8, marginBottom: 8 },
  ocrButton: { marginTop: 8 },
  selectedRow: { flexDirection: "row", alignItems: "center" },
  searchbar: { backgroundColor: "#f4f4f5", elevation: 0 },
  input: { marginBottom: 8, backgroundColor: "#ffffff" },
  submitArea: { padding: 16 },
  submitButton: { borderRadius: 8 },
  errorText: { marginHorizontal: 16 },
});
