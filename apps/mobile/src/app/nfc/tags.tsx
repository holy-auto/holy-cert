import { useCallback, useState } from "react";
import { View, FlatList, StyleSheet } from "react-native";
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Menu,
  IconButton,
  Dialog,
  Portal,
  Button,
  Snackbar,
} from "react-native-paper";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { mobileApi } from "@/lib/api";

type TagStatus =
  | "prepared"
  | "written"
  | "attached"
  | "lost"
  | "retired"
  | "error";

interface NfcTag {
  id: string;
  tag_code: string;
  uid: string | null;
  status: TagStatus;
  certificate_id: string | null;
  vehicle_id: string | null;
  certificate_no: string | null;
  plate_display: string | null;
}

const STATUS_STYLES: Record<TagStatus, { bg: string; text: string }> = {
  prepared: { bg: "#f3f4f6", text: "#374151" },
  written: { bg: "#dbeafe", text: "#1e40af" },
  attached: { bg: "#dcfce7", text: "#166534" },
  lost: { bg: "#fee2e2", text: "#991b1b" },
  retired: { bg: "#f3f4f6", text: "#71717a" },
  error: { bg: "#fee2e2", text: "#991b1b" },
};

const STATUS_LABELS: Record<TagStatus, string> = {
  prepared: "未書込",
  written: "書込済",
  attached: "車両装着",
  lost: "紛失",
  retired: "廃棄",
  error: "エラー",
};

type RetireAction = "lost" | "retired";

const ACTION_LABELS: Record<RetireAction, string> = {
  lost: "紛失として記録",
  retired: "廃棄",
};

export default function NfcTagsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [menuTagId, setMenuTagId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    { tag: NfcTag; action: RetireAction } | null
  >(null);
  const [snackbar, setSnackbar] = useState("");

  const {
    data: tags,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["nfc-tags", user?.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nfc_tags")
        .select(
          "id, tag_code, uid, status, certificate_id, vehicle_id, certificates(certificate_no), vehicles(plate_display)"
        )
        .eq("tenant_id", user!.tenantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      return (data as unknown[]).map((row: any) => ({
        id: row.id,
        tag_code: row.tag_code,
        uid: row.uid,
        status: row.status,
        certificate_id: row.certificate_id,
        vehicle_id: row.vehicle_id,
        certificate_no: row.certificates?.certificate_no ?? null,
        plate_display: row.vehicles?.plate_display ?? null,
      })) as NfcTag[];
    },
    enabled: !!user?.tenantId,
  });

  const retireMutation = useMutation({
    mutationFn: async (input: { id: string; status: RetireAction }) => {
      return mobileApi<{ nfc_tag: { id: string; status: TagStatus } }>(
        `/nfc/${input.id}/status`,
        { method: "PATCH", body: { status: input.status } }
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["nfc-tags"] });
      setSnackbar(
        `タグを${variables.status === "lost" ? "紛失" : "廃棄"}として記録しました`
      );
    },
    onError: (err) => {
      setSnackbar(err instanceof Error ? err.message : "状態変更に失敗しました");
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: NfcTag }) => {
      const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.prepared;
      const isTerminal = item.status === "retired";
      const canMarkLost =
        item.status === "written" || item.status === "attached";

      return (
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={styles.tagCode}>
                  {item.tag_code}
                </Text>
                {item.uid && (
                  <Text variant="bodySmall" style={styles.sub}>
                    UID: {item.uid}
                  </Text>
                )}
              </View>
              <Chip
                compact
                style={{ backgroundColor: statusStyle.bg }}
                textStyle={{ color: statusStyle.text, fontSize: 11 }}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </Chip>
              {!isTerminal && (
                <Menu
                  visible={menuTagId === item.id}
                  onDismiss={() => setMenuTagId(null)}
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={20}
                      onPress={() => setMenuTagId(item.id)}
                      accessibilityLabel="アクション"
                    />
                  }
                >
                  {canMarkLost && (
                    <Menu.Item
                      leadingIcon="help-circle-outline"
                      title={ACTION_LABELS.lost}
                      onPress={() => {
                        setMenuTagId(null);
                        setConfirm({ tag: item, action: "lost" });
                      }}
                    />
                  )}
                  <Menu.Item
                    leadingIcon="trash-can-outline"
                    title={ACTION_LABELS.retired}
                    onPress={() => {
                      setMenuTagId(null);
                      setConfirm({ tag: item, action: "retired" });
                    }}
                  />
                </Menu>
              )}
            </View>

            {(item.certificate_no || item.plate_display) && (
              <View style={styles.linkedInfo}>
                {item.certificate_no && (
                  <Text variant="bodySmall" style={styles.linked}>
                    証明書: {item.certificate_no}
                  </Text>
                )}
                {item.plate_display && (
                  <Text variant="bodySmall" style={styles.linked}>
                    車両: {item.plate_display}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      );
    },
    [menuTagId]
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <Text style={styles.empty}>NFCタグはありません</Text>
          }
        />
      )}

      <Portal>
        <Dialog
          visible={!!confirm}
          onDismiss={() => setConfirm(null)}
        >
          <Dialog.Icon
            icon={confirm?.action === "retired" ? "trash-can" : "help-circle"}
            color={confirm?.action === "retired" ? "#991b1b" : "#b45309"}
          />
          <Dialog.Title style={styles.dialogTitle}>
            {confirm ? ACTION_LABELS[confirm.action] : ""}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {confirm?.action === "retired"
                ? "このタグを廃棄します。廃棄後は状態を戻せません。"
                : "このタグを紛失として記録します。後で見つかった場合は再度書込みできます。"}
            </Text>
            {confirm?.tag && (
              <Text variant="bodySmall" style={styles.dialogSub}>
                対象: {confirm.tag.tag_code}
                {confirm.tag.certificate_no
                  ? ` (証明書 ${confirm.tag.certificate_no})`
                  : ""}
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirm(null)}>キャンセル</Button>
            <Button
              mode="contained"
              buttonColor={
                confirm?.action === "retired" ? "#991b1b" : "#b45309"
              }
              loading={retireMutation.isPending}
              disabled={retireMutation.isPending}
              onPress={() => {
                if (!confirm) return;
                retireMutation.mutate(
                  { id: confirm.tag.id, status: confirm.action },
                  { onSettled: () => setConfirm(null) }
                );
              }}
            >
              実行
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar("")}
        duration={3000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  list: { padding: 12 },
  card: { marginBottom: 8, backgroundColor: "#ffffff" },
  row: { flexDirection: "row", alignItems: "center" },
  tagCode: { fontWeight: "700", color: "#1a1a2e" },
  sub: { color: "#71717a", marginTop: 2 },
  linkedInfo: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 8,
  },
  linked: { color: "#3b82f6", marginTop: 2 },
  loading: { marginTop: 32 },
  empty: { textAlign: "center", color: "#71717a", marginTop: 32 },
  dialogTitle: { textAlign: "center", fontWeight: "700" },
  dialogSub: { color: "#71717a", marginTop: 8 },
});
