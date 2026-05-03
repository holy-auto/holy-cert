import { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import {
  Text,
  Card,
  Button,
  Icon,
  ProgressBar,
  ActivityIndicator,
  Snackbar,
} from "react-native-paper";
import { Stack } from "expo-router";

import { useAuthStore } from "@/stores/authStore";
import { useTerminal } from "@/hooks/useTerminal";

/**
 * Apple Tap to Pay 要件:
 *   3.6  通常フロー外（設定画面など）から有効化可能
 *   3.8  T&C 同意は admin (owner) 以上に限定
 *   3.8.1 非 admin には管理者連絡を促すメッセージを表示
 *   3.9.1 設定進捗インジケータ
 *   4.3  教育コンテンツへ Settings/Help からアクセス可能
 *   1.4  iOS バージョン非対応の案内
 */
export default function TapToPaySettingsScreen() {
  const { user, hasMinRole } = useAuthStore();
  const isAdmin = hasMinRole("admin");
  const {
    initTerminal,
    connectTapToPay,
    readerStatus,
    readerError,
    osVersionSupported,
    configurationProgress,
    termsAccepted,
  } = useTerminal();

  const [busy, setBusy] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  // マウント時に warmup
  useEffect(() => {
    void initTerminal();
  }, [initTerminal]);

  async function handleEnable() {
    if (!isAdmin) return;
    setBusy(true);
    try {
      const ok = await connectTapToPay();
      if (ok) {
        setSnackbar("Tap to Pay の準備が完了しました");
      } else {
        setSnackbar(readerError ?? "Tap to Pay の有効化に失敗しました");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Tap to Pay 設定", headerShown: true }} />
      <ScrollView style={styles.container}>
        {/* iOSバージョン非対応の警告 (要件 1.4) */}
        {!osVersionSupported && (
          <Card style={[styles.card, styles.warnCard]} mode="outlined">
            <Card.Content style={styles.warnRow}>
              <Icon source="alert-circle" size={28} color="#b45309" />
              <View style={{ flex: 1 }}>
                <Text variant="titleSmall" style={styles.warnTitle}>
                  iOS の更新が必要です
                </Text>
                <Text variant="bodySmall" style={styles.warnSub}>
                  Tap to Pay は iPhone XS 以降 / iOS 16.4 以降で利用可能です。
                  設定アプリから iOS を最新版に更新してください。
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* 概要 */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>
              iPhone のタッチ決済について
            </Text>
            <Text variant="bodyMedium" style={styles.body}>
              追加のカードリーダー無しで、iPhone 1台で
              コンタクトレスカード・Apple Pay・他の電子ウォレットを
              受け付けられます。
            </Text>

            <View style={styles.bullets}>
              <Bullet text="コンタクトレスカード（Visa / Mastercard 等）" />
              <Bullet text="Apple Pay" />
              <Bullet text="その他の電子ウォレット（Google Pay 等）" />
            </View>
          </Card.Content>
        </Card>

        {/* 有効化アクション (admin限定) */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>
              有効化
            </Text>

            {!isAdmin ? (
              // 要件 3.8.1: 非 admin への案内
              <View style={styles.notAdminBox}>
                <Icon source="lock-outline" size={24} color="#71717a" />
                <Text variant="bodyMedium" style={styles.notAdminText}>
                  Tap to Pay の有効化は管理者のみが行えます。{"\n"}
                  管理者にご連絡ください。
                </Text>
              </View>
            ) : termsAccepted === true ? (
              <Text variant="bodyMedium" style={styles.enabledText}>
                ✅ 有効化済みです。チェックアウトでお使いいただけます。
              </Text>
            ) : (
              <>
                <Text variant="bodySmall" style={styles.body}>
                  下記ボタンを押すと、Apple の利用規約への同意 +
                  iPhone のセットアップが行われます。
                </Text>
                <Button
                  mode="contained"
                  icon="apple"
                  onPress={handleEnable}
                  loading={busy || readerStatus === "connecting"}
                  disabled={!osVersionSupported || busy}
                  style={styles.enableButton}
                  buttonColor="#1a1a2e"
                >
                  Tap to Pay を有効化する
                </Button>
              </>
            )}

            {/* 要件 3.9.1: 設定進捗インジケータ */}
            {configurationProgress != null &&
              configurationProgress < 1 && (
                <View style={styles.progressBox}>
                  <View style={styles.progressHeader}>
                    <ActivityIndicator size="small" color="#1d4ed8" />
                    <Text variant="bodySmall" style={styles.progressLabel}>
                      Tap to Pay を準備中… {Math.round(configurationProgress * 100)}%
                    </Text>
                  </View>
                  <ProgressBar
                    progress={configurationProgress}
                    color="#1d4ed8"
                    style={{ marginTop: 6 }}
                  />
                  <Text variant="bodySmall" style={styles.progressNote}>
                    数分かかる場合があります。アプリを閉じずにお待ちください。
                  </Text>
                </View>
              )}

            {readerError ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {readerError}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        {/* 要件 4.3: 設定/ヘルプ から教育コンテンツへ */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <Text variant="titleMedium" style={styles.heading}>
              使い方
            </Text>
            <View style={styles.steps}>
              <Step n={1} text="チェックアウト画面で「iPhone のタッチ決済」をタップ" />
              <Step n={2} text="iPhone の上部にお客様のカード・スマホをかざしてもらう" />
              <Step n={3} text="支払い完了画面が表示されたら成功（iPhone はバイブで通知）" />
              <Step n={4} text="領収書はSMS・メール・共有メニューから送信可能" />
            </View>
            <Text variant="bodySmall" style={styles.body}>
              ※ コンタクトレス決済できないカードの場合は、現金または他の決済方法をご案内ください。
            </Text>
          </Card.Content>
        </Card>

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

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Icon source="check-circle" size={18} color="#15803d" />
      <Text variant="bodyMedium" style={styles.bulletText}>
        {text}
      </Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text variant="bodyMedium" style={styles.stepText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  card: { margin: 12, marginBottom: 0, backgroundColor: "#ffffff" },
  heading: { fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
  body: { color: "#3f3f46", lineHeight: 22 },
  bullets: { marginTop: 12, gap: 6 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { color: "#1a1a2e" },
  notAdminBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f4f4f5",
    padding: 12,
    borderRadius: 8,
  },
  notAdminText: { color: "#3f3f46", flex: 1 },
  enabledText: { color: "#15803d", fontWeight: "600" },
  enableButton: { marginTop: 12, borderRadius: 8 },
  progressBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressLabel: { color: "#1d4ed8", fontWeight: "600" },
  progressNote: { color: "#3b82f6", marginTop: 6 },
  errorText: { color: "#b91c1c", marginTop: 8 },
  steps: { gap: 10, marginVertical: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  stepText: { color: "#1a1a2e", flex: 1 },
  warnCard: { backgroundColor: "#fffbeb", borderColor: "#fcd34d" },
  warnRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  warnTitle: { color: "#92400e", fontWeight: "700" },
  warnSub: { color: "#b45309", marginTop: 2 },
});
