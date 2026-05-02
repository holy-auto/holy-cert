import { View, StyleSheet, ScrollView } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  ActivityIndicator,
} from "react-native-paper";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface StandalonePayment {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
  received_amount: number | null;
  change_amount: number | null;
  note: string | null;
  document: {
    id: string;
    doc_number: string;
    items_json: { name: string; quantity: number; unit_price: number; amount: number }[] | null;
    subtotal: number | null;
    tax: number | null;
    total: number | null;
  } | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "現金",
  card: "カード",
  qr: "QR決済",
  bank_transfer: "振込",
};

interface TenantInvoiceInfo {
  name: string;
  registration_number: string | null;
  address: string | null;
  contact_phone: string | null;
}

export default function StandaloneReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: tenant } = useQuery<TenantInvoiceInfo | null>({
    queryKey: ["tenant-invoice", user?.tenantId],
    queryFn: async () => {
      if (!user?.tenantId) return null;
      const { data, error } = await supabase
        .from("tenants")
        .select("name, registration_number, address, contact_phone")
        .eq("id", user.tenantId)
        .single();
      if (error) throw error;
      return data as TenantInvoiceInfo;
    },
    enabled: !!user?.tenantId,
  });

  const { data: payment, isLoading } = useQuery<StandalonePayment>({
    queryKey: ["standalone-receipt", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          id, amount, payment_method, paid_at, received_amount, change_amount, note,
          document:documents(id, doc_number, items_json, subtotal, tax, total)
        `,
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as StandalonePayment;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!payment) {
    return (
      <View style={styles.center}>
        <Text>レシートが見つかりません</Text>
      </View>
    );
  }

  const paidDate = new Date(payment.paid_at);
  const TAX_RATE = 0.1;
  const taxIncluded = payment.amount;
  const taxAmount =
    payment.document?.tax ?? Math.round(taxIncluded - taxIncluded / (1 + TAX_RATE));
  const subtotal = payment.document?.subtotal ?? taxIncluded - taxAmount;
  const items = payment.document?.items_json ?? [];

  return (
    <>
      <Stack.Screen options={{ title: "レシート" }} />
      <ScrollView style={styles.container}>
        {/* 発行者情報 */}
        {tenant && (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.issuerHeader}>
              <Text variant="titleMedium" style={styles.issuerName}>
                {tenant.name}
              </Text>
              {tenant.address && (
                <Text variant="bodySmall" style={styles.issuerSub}>
                  {tenant.address}
                </Text>
              )}
              {tenant.contact_phone && (
                <Text variant="bodySmall" style={styles.issuerSub}>
                  TEL: {tenant.contact_phone}
                </Text>
              )}
              {tenant.registration_number && (
                <Text variant="bodySmall" style={styles.regNumber}>
                  登録番号: {tenant.registration_number}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* ヘッダー */}
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.receiptHeader}>
            <Text variant="headlineSmall" style={styles.checkmark}>
              {"✓"}
            </Text>
            <Text variant="titleLarge" style={styles.paidText}>
              お支払い完了
            </Text>
            <Text variant="headlineMedium" style={styles.amount}>
              ¥{payment.amount.toLocaleString()}
            </Text>
            <Text variant="bodyMedium" style={styles.subText}>
              {METHOD_LABELS[payment.payment_method] ?? payment.payment_method}
            </Text>
            <Text variant="bodySmall" style={styles.subText}>
              {paidDate.toLocaleDateString("ja-JP")}{" "}
              {paidDate.toLocaleTimeString("ja-JP", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {payment.document?.doc_number && (
              <Text variant="bodySmall" style={styles.docNumber}>
                {payment.document.doc_number}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* 明細 */}
        {items.length > 0 && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text variant="titleMedium" style={styles.heading}>
                明細
              </Text>
              {items.map((item, index) => (
                <View key={index} style={styles.lineItem}>
                  <Text variant="bodyMedium" style={{ flex: 1 }}>
                    {item.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.subText}>
                    x{item.quantity}
                  </Text>
                  <Text variant="bodyMedium" style={styles.price}>
                    ¥{item.amount.toLocaleString()}
                  </Text>
                </View>
              ))}
              <Divider style={{ marginVertical: 8 }} />

              <View style={styles.lineItem}>
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  小計（税抜）
                </Text>
                <Text variant="bodyMedium">¥{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.lineItem}>
                <Text variant="bodyMedium" style={{ flex: 1 }}>
                  消費税 (10% 対象 ¥{subtotal.toLocaleString()})
                </Text>
                <Text variant="bodyMedium">¥{taxAmount.toLocaleString()}</Text>
              </View>
              <Divider style={{ marginVertical: 8 }} />
              <View style={styles.lineItem}>
                <Text variant="titleSmall" style={{ flex: 1, fontWeight: "700" }}>
                  合計（税込）
                </Text>
                <Text variant="titleSmall" style={{ fontWeight: "700" }}>
                  ¥{payment.amount.toLocaleString()}
                </Text>
              </View>
              {payment.payment_method === "cash" && (
                <>
                  <View style={styles.lineItem}>
                    <Text variant="bodyMedium" style={{ flex: 1 }}>
                      お預かり
                    </Text>
                    <Text variant="bodyMedium">
                      ¥{(payment.received_amount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.lineItem}>
                    <Text variant="bodyMedium" style={{ flex: 1 }}>
                      おつり
                    </Text>
                    <Text variant="bodyMedium">
                      ¥{(payment.change_amount ?? 0).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* アクション */}
        <View style={styles.actions}>
          <Button
            mode="contained"
            icon="home"
            onPress={() => router.replace("/(tabs)")}
            style={styles.actionButton}
            buttonColor="#1a1a2e"
          >
            ホームに戻る
          </Button>
          <Button
            mode="outlined"
            icon="plus-circle"
            onPress={() => router.replace("/pos/walk-in")}
            style={styles.actionButton}
          >
            続けて会計する
          </Button>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { marginHorizontal: 16, marginTop: 16, backgroundColor: "#ffffff" },
  issuerHeader: { paddingVertical: 12 },
  issuerName: { fontWeight: "700", color: "#1a1a2e" },
  issuerSub: { color: "#71717a", marginTop: 2 },
  regNumber: { color: "#1a1a2e", marginTop: 6, fontFamily: "monospace", fontWeight: "600" },
  receiptHeader: { alignItems: "center", paddingVertical: 24 },
  checkmark: { fontSize: 48, color: "#10b981" },
  paidText: { fontWeight: "700", color: "#1a1a2e", marginTop: 8 },
  amount: { fontWeight: "700", color: "#1a1a2e", marginTop: 4 },
  docNumber: { color: "#71717a", marginTop: 8, fontFamily: "monospace" },
  heading: { fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  subText: { color: "#71717a", marginTop: 2 },
  price: { fontWeight: "600", color: "#1a1a2e", marginLeft: 12 },
  lineItem: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  actions: { padding: 16, gap: 12 },
  actionButton: { borderRadius: 8 },
});
