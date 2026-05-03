import { useState } from "react";
import {
  Linking,
  Platform,
  Share,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Text,
  TextInput,
} from "react-native-paper";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** レシートWeb URL（Stripe Checkout receipt URL or 自社レシート公開URL） */
  receiptUrl: string;
  /** Snackbar 等で「送信しました」を出すためのコールバック */
  onSent?: (channel: "sms" | "email" | "share") => void;
}

/**
 * Apple Tap to Pay 要件 5.10 を満たすレシート共有ダイアログ。
 *   - SMS / Email / iOS Share Sheet (Activity views) の3チャネルから選択
 *   - 承認/拒否どちらの取引でも呼び出せる前提
 */
export function ReceiptShareDialog({
  visible,
  onDismiss,
  receiptUrl,
  onSent,
}: Props) {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendSms() {
    setError(null);
    if (!phone.trim()) {
      setError("電話番号を入力してください");
      return;
    }
    try {
      setBusy(true);
      const body = encodeURIComponent(
        `Ledra より領収書をお送りします\n${receiptUrl}`
      );
      const sep = Platform.OS === "ios" ? "&" : "?";
      const url = `sms:${phone.trim()}${sep}body=${body}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("SMSアプリが利用できません");
      await Linking.openURL(url);
      onSent?.("sms");
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SMS送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    setError(null);
    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    try {
      setBusy(true);
      const subject = encodeURIComponent("Ledra 領収書");
      const body = encodeURIComponent(
        `Ledra より領収書をお送りします\n${receiptUrl}`
      );
      const url = `mailto:${email.trim()}?subject=${subject}&body=${body}`;
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("メールアプリが利用できません");
      await Linking.openURL(url);
      onSent?.("email");
      onDismiss();
    } catch (e) {
      setError(e instanceof Error ? e.message : "メール送信に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function shareSheet() {
    try {
      setBusy(true);
      await Share.share({ message: `Ledra 領収書\n${receiptUrl}`, url: receiptUrl });
      onSent?.("share");
      onDismiss();
    } catch {
      // ユーザーがシートを閉じた場合などは無視
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>レシートを送る</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodySmall" style={styles.note}>
            お客様にレシートを送付します。SMS・メール・端末の共有機能から選択できます。
          </Text>

          <Text variant="labelLarge" style={styles.section}>
            SMS
          </Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              label="電話番号"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              dense
              style={styles.input}
            />
            <Button mode="contained" onPress={sendSms} disabled={busy}>
              送信
            </Button>
          </View>

          <Text variant="labelLarge" style={styles.section}>
            メール
          </Text>
          <View style={styles.row}>
            <TextInput
              mode="outlined"
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              dense
              style={styles.input}
            />
            <Button mode="contained" onPress={sendEmail} disabled={busy}>
              送信
            </Button>
          </View>

          <Text variant="labelLarge" style={styles.section}>
            その他
          </Text>
          <Button
            mode="outlined"
            icon="share-variant"
            onPress={shareSheet}
            disabled={busy}
            style={{ marginTop: 4 }}
          >
            共有メニューで送る (AirDrop/LINE/QR等)
          </Button>

          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>閉じる</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  note: { color: "#71717a", marginBottom: 12 },
  section: { color: "#1a1a2e", marginTop: 12, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, backgroundColor: "#ffffff" },
});
