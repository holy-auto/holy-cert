import { View, ScrollView, StyleSheet } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  ActivityIndicator,
  Chip,
} from "react-native-paper";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

interface Customer {
  id: string;
  name: string;
  name_kana: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  address: string | null;
  note: string | null;
}

interface Vehicle {
  id: string;
  plate_display: string | null;
  maker: string | null;
  model: string | null;
  year: number | null;
}

interface ReservationHistoryRow {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  vehicle: { plate_display: string | null } | null;
  reservation_items: { menu_item: { name: string } | null }[];
}

interface PaymentHistoryRow {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
}

interface CustomerStats {
  totalSpent: number;
  visitCount: number;
  lastVisitDate: string | null;
  reservations: ReservationHistoryRow[];
  payments: PaymentHistoryRow[];
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#3b82f6",
  arrived: "#f59e0b",
  in_progress: "#f97316",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "確認済",
  arrived: "来店",
  in_progress: "作業中",
  completed: "完了",
  cancelled: "キャンセル",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "現金",
  card: "カード",
  qr: "QR",
  bank_transfer: "振込",
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select(
          "id, name, name_kana, email, phone, postal_code, address, note"
        )
        .eq("id", id)
        .eq("tenant_id", user!.tenantId)
        .single();
      if (error) throw error;
      return data as Customer;
    },
    enabled: !!id && !!user?.tenantId,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["customer-vehicles", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_display, maker, model, year")
        .eq("customer_id", id)
        .eq("tenant_id", user!.tenantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Vehicle[];
    },
    enabled: !!id && !!user?.tenantId,
  });

  // タイムライン用: 来店履歴 + 決済履歴 + 集計
  const { data: stats } = useQuery<CustomerStats>({
    queryKey: ["customer-stats", id],
    queryFn: async () => {
      const [reservationsRes, paymentsRes] = await Promise.all([
        supabase
          .from("reservations")
          .select(
            `
            id, scheduled_date, scheduled_time, status,
            vehicle:vehicles(plate_display),
            reservation_items(menu_item:menu_items(name))
          `
          )
          .eq("customer_id", id)
          .eq("tenant_id", user!.tenantId)
          .order("scheduled_date", { ascending: false })
          .limit(10),
        supabase
          .from("payments")
          .select("id, amount, payment_method, paid_at, reservation_id")
          .eq("tenant_id", user!.tenantId)
          .in(
            "reservation_id",
            // サブクエリ代わり: 同一顧客の予約IDを別途取得
            (
              await supabase
                .from("reservations")
                .select("id")
                .eq("customer_id", id)
                .eq("tenant_id", user!.tenantId)
            ).data?.map((r) => r.id) ?? []
          )
          .order("paid_at", { ascending: false })
          .limit(10),
      ]);

      const reservations = (reservationsRes.data ?? []) as unknown as
        ReservationHistoryRow[];
      const payments = (paymentsRes.data ?? []) as unknown as
        PaymentHistoryRow[];

      const totalSpent = payments.reduce((s, p) => s + (p.amount ?? 0), 0);
      const visitCount = reservations.filter(
        (r) => r.status === "completed"
      ).length;
      const lastVisitDate =
        reservations.find((r) => r.status === "completed")?.scheduled_date ??
        null;

      return { totalSpent, visitCount, lastVisitDate, reservations, payments };
    },
    enabled: !!id && !!user?.tenantId,
  });

  if (isLoading || !customer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 基本情報 */}
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="headlineSmall" style={styles.heading}>
            {customer.name}
          </Text>
          {customer.name_kana && (
            <Text variant="bodyMedium" style={styles.kana}>
              {customer.name_kana}
            </Text>
          )}

          <Divider style={styles.divider} />

          <InfoRow label="メール" value={customer.email} />
          <InfoRow label="電話" value={customer.phone} />
          <InfoRow label="郵便番号" value={customer.postal_code} />
          <InfoRow label="住所" value={customer.address} />
          {customer.note && (
            <>
              <Text variant="labelMedium" style={styles.label}>
                メモ
              </Text>
              <Text variant="bodyMedium" style={styles.note}>
                {customer.note}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* 集計サマリ */}
      {stats && (
        <Card style={styles.card} mode="outlined">
          <Card.Content style={styles.statRow}>
            <StatBlock label="来店回数" value={`${stats.visitCount}回`} />
            <StatBlock
              label="累計購入額"
              value={`¥${stats.totalSpent.toLocaleString()}`}
            />
            <StatBlock
              label="最終来店"
              value={stats.lastVisitDate ?? "—"}
            />
          </Card.Content>
        </Card>
      )}

      {/* 登録車両 */}
      <View style={styles.section}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          登録車両
        </Text>
        {vehicles && vehicles.length > 0 ? (
          vehicles.map((v) => (
            <Card
              key={v.id}
              style={styles.vehicleCard}
              mode="outlined"
              onPress={() => router.push(`/vehicles/${v.id}`)}
            >
              <Card.Content style={styles.vehicleRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall" style={styles.vehicleTitle}>
                    {v.maker} {v.model}
                  </Text>
                  <Text variant="bodySmall" style={styles.sub}>
                    {v.plate_display} {v.year ? `(${v.year})` : ""}
                  </Text>
                </View>
                <Chip compact>詳細</Chip>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.empty}>登録車両はありません</Text>
        )}
      </View>

      {/* 来店履歴 */}
      {stats && stats.reservations.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            来店履歴
          </Text>
          {stats.reservations.map((r) => (
            <Card
              key={r.id}
              style={styles.timelineCard}
              mode="outlined"
              onPress={() => router.push(`/reservations/${r.id}`)}
            >
              <Card.Content style={styles.timelineRow}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={styles.timelineDate}>
                    {r.scheduled_date}
                    {r.scheduled_time ? ` ${r.scheduled_time}` : ""}
                  </Text>
                  <Text variant="bodySmall" style={styles.sub}>
                    {r.vehicle?.plate_display ?? "車両未登録"}
                    {" / "}
                    {r.reservation_items
                      .map((ri) => ri.menu_item?.name)
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("、") || "メニュー未設定"}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{
                    backgroundColor:
                      (STATUS_COLORS[r.status] ?? "#71717a") + "20",
                  }}
                  textStyle={{
                    color: STATUS_COLORS[r.status] ?? "#71717a",
                    fontSize: 11,
                  }}
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </Chip>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      {/* 決済履歴 */}
      {stats && stats.payments.length > 0 && (
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            決済履歴
          </Text>
          {stats.payments.map((p) => {
            const d = new Date(p.paid_at);
            return (
              <Card key={p.id} style={styles.timelineCard} mode="outlined">
                <Card.Content style={styles.timelineRow}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={styles.timelineDate}>
                      {d.toLocaleDateString("ja-JP")}{" "}
                      {d.toLocaleTimeString("ja-JP", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text variant="bodySmall" style={styles.sub}>
                      {METHOD_LABELS[p.payment_method] ?? p.payment_method}
                    </Text>
                  </View>
                  <Text variant="titleSmall" style={styles.amount}>
                    ¥{p.amount.toLocaleString()}
                  </Text>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      <Button
        mode="contained"
        style={styles.editButton}
        buttonColor="#1a1a2e"
        onPress={() => router.push(`/customers/edit/${id}`)}
      >
        編集
      </Button>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text variant="labelMedium" style={styles.label}>
        {label}
      </Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text variant="labelSmall" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="titleMedium" style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { margin: 12, backgroundColor: "#ffffff" },
  heading: { fontWeight: "700", color: "#1a1a2e" },
  kana: { color: "#71717a", marginTop: 2 },
  divider: { marginVertical: 12 },
  infoRow: { marginBottom: 8 },
  label: { color: "#71717a", marginBottom: 2 },
  note: {
    color: "#3f3f46",
    backgroundColor: "#f4f4f5",
    padding: 8,
    borderRadius: 4,
  },
  section: { padding: 12 },
  sectionTitle: { fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  vehicleCard: { marginBottom: 8, backgroundColor: "#ffffff" },
  vehicleRow: { flexDirection: "row", alignItems: "center" },
  vehicleTitle: { fontWeight: "600", color: "#1a1a2e" },
  sub: { color: "#71717a", marginTop: 2 },
  empty: { color: "#71717a", textAlign: "center", marginTop: 16 },
  editButton: { margin: 12, marginBottom: 32 },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  statBlock: { flex: 1, alignItems: "center" },
  statLabel: { color: "#71717a", marginBottom: 4 },
  statValue: { fontWeight: "700", color: "#1a1a2e" },
  timelineCard: { marginBottom: 8, backgroundColor: "#ffffff" },
  timelineRow: { flexDirection: "row", alignItems: "center" },
  timelineDate: { fontWeight: "600", color: "#1a1a2e" },
  amount: { fontWeight: "700", color: "#1a1a2e", marginLeft: 12 },
});
