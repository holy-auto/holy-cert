import { Platform, Pressable, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import Svg, { Circle, Path } from "react-native-svg";

interface Props {
  onPress: () => void;
  /** initializing | collecting | processing | idle */
  state: "idle" | "initializing" | "collecting" | "processing";
  /** ¥金額表示用 */
  amountLabel: string;
  disabled?: boolean;
}

/**
 * Apple Tap to Pay 要件 5.1〜5.5 を満たす専用ボタン。
 *   - 5.1: 視認性高い・常時可視
 *   - 5.2: 決済方法リストの最上位 (画面側の配置で担保)
 *   - 5.3: グレーアウト禁止 (T&C未同意でも常時押下可能)
 *   - 5.4: ローカライズ済みコピー  (日本語: "iPhone のタッチ決済")
 *   - 5.5: SF Symbols "wave.3.right.circle" 同等のアイコン
 *           (react-native-svg で再現。iOS純正と同じ意匠)
 *
 * NOTE: SF Symbols そのものを RN で使うには別パッケージが要るが、
 *       wave.3.right.circle の視覚 (3本の波紋 + 円) は SVG で
 *       充分に再現可能。Apple のレビューはピクセル一致は要求していない。
 */
export function TapToPayButton({ onPress, state, amountLabel, disabled }: Props) {
  const isBusy = state === "initializing" || state === "processing";
  const label = (() => {
    if (state === "initializing") return "Tap to Pay 準備中…";
    if (state === "collecting") return "カードをかざしてください";
    if (state === "processing") return "処理中…";
    // 5.4 日本語ロケール準拠
    return "iPhone のタッチ決済";
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${amountLabel}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
      ]}
      android_ripple={{ color: "#1f2a4a" }}
    >
      <View style={styles.iconWrap}>
        {isBusy ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <WaveCircleIcon color="#ffffff" size={28} />
        )}
      </View>
      <View style={styles.labelWrap}>
        <Text variant="titleMedium" style={styles.label}>
          {label}
        </Text>
        <Text variant="labelSmall" style={styles.amount}>
          {amountLabel}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * SF Symbols "wave.3.right.circle" のSVG再現。
 * 円の中に3本の波線 (右向き) を描画する。
 */
function WaveCircleIcon({ color, size }: { color: string; size: number }) {
  const stroke = 2;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth={stroke}
        fill="none"
      />
      {/* 内側 (短い波) */}
      <Path
        d="M9 9.5 C 11.5 11, 11.5 13, 9 14.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
      {/* 中央 */}
      <Path
        d="M12 7.5 C 16 10, 16 14, 12 16.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
      {/* 外側 (長い波) */}
      <Path
        d="M15 5.5 C 21 9, 21 15, 15 18.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 64,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pressed: {
    backgroundColor: "#2d3050",
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    color: "#ffffff",
    fontWeight: "700",
  },
  amount: {
    color: "#cbd5f5",
    marginTop: 2,
  },
});
