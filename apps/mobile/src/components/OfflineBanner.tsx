import { View, StyleSheet } from "react-native";
import { Text, Icon } from "react-native-paper";
import {
  useNetworkStatus,
  isEffectivelyOffline,
} from "@/hooks/useNetworkStatus";

/**
 * 画面最上部に表示するオフラインバナー。
 * 接続中は何も描画しない (null)。屋外整備で電波が切れたとき即座に
 * ユーザーに気付かせる用途。
 *
 * SafeArea の上に置く想定 (StatusBar の直下)。
 */
export function OfflineBanner() {
  const status = useNetworkStatus();
  if (!isEffectivelyOffline(status)) return null;

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Icon source="cloud-off-outline" size={16} color="#ffffff" />
      <Text variant="labelMedium" style={styles.text}>
        オフラインです。書込み操作は接続復帰後に同期されます。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#991b1b",
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 8,
  },
  text: { color: "#ffffff", fontWeight: "600" },
});
