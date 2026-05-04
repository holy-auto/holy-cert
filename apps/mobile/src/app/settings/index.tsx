import { useState } from "react";
import { View, ScrollView, StyleSheet, Platform, Alert, Linking } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  Chip,
  Dialog,
  Portal,
  Snackbar,
} from "react-native-paper";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

const ENV = process.env.EXPO_PUBLIC_ENV ?? "development";
const WEB_APP_URL =
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://app.ledra.co.jp";

const ENV_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  development: { label: "DEV", bg: "#fef3c7", fg: "#92400e" },
  preview: { label: "PREVIEW", bg: "#dbeafe", fg: "#1e40af" },
  staging: { label: "STAGING", bg: "#fce7f3", fg: "#9d174d" },
  production: { label: "PROD", bg: "#dcfce7", fg: "#166534" },
};

export default function SettingsIndexScreen() {
  const { user, selectedStore, setSelectedStore, reset } = useAuthStore();
  const queryClient = useQueryClient();
  const [clearVisible, setClearVisible] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.manifest2?.extra?.expoClient?.version ??
    "1.0.0";

  // EAS Build 番号 (auto-incremented). 開発ビルドでは "—"
  const buildNumber =
    Platform.OS === "ios"
      ? (Constants.expoConfig?.ios?.buildNumber ?? "—")
      : String(Constants.expoConfig?.android?.versionCode ?? "—");

  const envInfo = ENV_BADGE[ENV] ?? ENV_BADGE.development;

  async function handleSwitchStore() {
    setSelectedStore(null);
    router.replace("/(auth)/select-store");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
    router.replace("/(auth)/login");
  }

  async function handleClearCache() {
    setClearVisible(false);
    queryClient.clear();
    setSnackbar("キャッシュを削除しました");
  }

  async function handleOpenWeb() {
    try {
      const supported = await Linking.canOpenURL(WEB_APP_URL);
      if (!supported) throw new Error("ブラウザを開けません");
      await Linking.openURL(WEB_APP_URL);
    } catch (e) {
      setSnackbar(
        e instanceof Error ? e.message : "Web版を開けませんでした"
      );
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* 環境バッジ — production 以外は目立つ表示 (誤操作防止) */}
      {ENV !== "production" && (
        <View style={styles.envBanner}>
          <Chip
            compact
            style={{ backgroundColor: envInfo.bg }}
            textStyle={{ color: envInfo.fg, fontWeight: "700" }}
          >
            {envInfo.label} 環境
          </Chip>
        </View>
      )}

      {/* User Info */}
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.heading}>
            ユーザー情報
          </Text>
          <Divider style={styles.divider} />

          <InfoRow label="メール" value={user?.email ?? "-"} />
          <InfoRow label="ロール" value={user?.role ?? "-"} />
          <InfoRow label="テナント" value={user?.tenantName ?? "-"} />
          <InfoRow label="店舗" value={selectedStore?.name ?? "-"} />
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          icon="apple"
          onPress={() => router.push("/settings/tap-to-pay")}
          style={styles.actionButton}
          textColor="#1a1a2e"
        >
          Tap to Pay 設定
        </Button>

        <Button
          mode="outlined"
          icon="store"
          onPress={handleSwitchStore}
          style={styles.actionButton}
          textColor="#1a1a2e"
        >
          店舗切替
        </Button>

        <Button
          mode="outlined"
          icon="open-in-new"
          onPress={handleOpenWeb}
          style={styles.actionButton}
          textColor="#1a1a2e"
        >
          Web版を開く
        </Button>

        <Button
          mode="outlined"
          icon="broom"
          onPress={() => setClearVisible(true)}
          style={styles.actionButton}
          textColor="#1a1a2e"
        >
          キャッシュをクリア
        </Button>

        <Button
          mode="outlined"
          icon="logout"
          onPress={() =>
            Alert.alert(
              "ログアウト",
              "本当にログアウトしますか？",
              [
                { text: "キャンセル", style: "cancel" },
                { text: "ログアウト", style: "destructive", onPress: handleLogout },
              ],
              { cancelable: true }
            )
          }
          style={styles.actionButton}
          textColor="#991b1b"
        >
          ログアウト
        </Button>
      </View>

      {/* App Info */}
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.heading}>
            アプリ情報
          </Text>
          <Divider style={styles.divider} />
          <InfoRow label="アプリ名" value="Ledra Mobile" />
          <InfoRow label="バージョン" value={appVersion} />
          <InfoRow label="ビルド" value={buildNumber} />
          <InfoRow
            label="プラットフォーム"
            value={`${Platform.OS} ${Platform.Version}`}
          />
          <InfoRow label="環境" value={ENV} />
        </Card.Content>
      </Card>

      <Portal>
        <Dialog visible={clearVisible} onDismiss={() => setClearVisible(false)}>
          <Dialog.Icon icon="broom" />
          <Dialog.Title style={{ textAlign: "center" }}>
            キャッシュを削除
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              アプリ内に保存されているクエリキャッシュを削除します。
              次回以降の表示は最新データの取得から始まります。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setClearVisible(false)}>キャンセル</Button>
            <Button
              mode="contained"
              buttonColor="#1a1a2e"
              onPress={handleClearCache}
            >
              削除
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
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelMedium" style={styles.label}>
        {label}
      </Text>
      <Text variant="bodyMedium">{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  envBanner: {
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: "flex-start",
  },
  card: { margin: 12, backgroundColor: "#ffffff" },
  heading: { fontWeight: "700", color: "#1a1a2e" },
  divider: { marginVertical: 12 },
  infoRow: { marginBottom: 8 },
  label: { color: "#71717a", marginBottom: 2 },
  actions: { padding: 12, gap: 8 },
  actionButton: { borderColor: "#e4e4e7" },
});
