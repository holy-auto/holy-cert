import { View, StyleSheet } from "react-native";
import { Card, Text, Button, Icon } from "react-native-paper";

export type PaymentOutcomeStatus = "approved" | "declined" | "timeout";

interface Props {
  status: PaymentOutcomeStatus;
  amount: number;
  reason?: string | null;
  onSendReceipt: () => void;
  onClose: () => void;
}

/**
 * Apple Tap to Pay 要件 5.9 / 5.10:
 *   - 取引結果（承認/拒否/タイムアウト）を明示
 *   - 承認/拒否どちらでもデジタルレシート送信可能
 */
export function PaymentOutcome({
  status,
  amount,
  reason,
  onSendReceipt,
  onClose,
}: Props) {
  const map: Record<
    PaymentOutcomeStatus,
    { icon: string; color: string; bg: string; title: string; desc: string }
  > = {
    approved: {
      icon: "check-circle",
      color: "#15803d",
      bg: "#f0fdf4",
      title: "決済承認",
      desc: "お支払いが完了しました",
    },
    declined: {
      icon: "close-circle",
      color: "#b91c1c",
      bg: "#fef2f2",
      title: "決済拒否",
      desc: "別のカードまたは支払方法をお試しください",
    },
    timeout: {
      icon: "clock-alert",
      color: "#b45309",
      bg: "#fffbeb",
      title: "タイムアウト",
      desc: "応答がなかったため取引を中止しました",
    },
  };
  const s = map[status];

  return (
    <Card style={[styles.card, { backgroundColor: s.bg }]} mode="outlined">
      <Card.Content style={styles.content}>
        <Icon source={s.icon} size={56} color={s.color} />
        <Text variant="titleLarge" style={[styles.title, { color: s.color }]}>
          {s.title}
        </Text>
        <Text variant="bodyMedium" style={styles.desc}>
          {s.desc}
        </Text>
        <Text variant="headlineSmall" style={styles.amount}>
          ¥{amount.toLocaleString()}
        </Text>
        {reason ? (
          <Text variant="bodySmall" style={styles.reason}>
            {reason}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {/* 5.10: 承認/拒否どちらでもレシート送信可能 */}
          <Button
            mode="contained"
            icon="email-outline"
            onPress={onSendReceipt}
            buttonColor={s.color}
            style={styles.action}
          >
            デジタルレシートを送る
          </Button>
          <Button mode="text" onPress={onClose} style={styles.action}>
            閉じる
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16 },
  content: { alignItems: "center", paddingVertical: 24 },
  title: { fontWeight: "700", marginTop: 12 },
  desc: { color: "#3f3f46", textAlign: "center", marginTop: 4 },
  amount: { fontWeight: "700", color: "#1a1a2e", marginTop: 12 },
  reason: { color: "#71717a", marginTop: 8, textAlign: "center" },
  actions: { width: "100%", marginTop: 20, gap: 8 },
  action: { borderRadius: 8 },
});
