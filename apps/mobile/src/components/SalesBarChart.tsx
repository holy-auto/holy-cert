import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";

export interface SalesPoint {
  /** ISO date YYYY-MM-DD */
  date: string;
  amount: number;
}

interface Props {
  data: SalesPoint[];
  width: number;
  height?: number;
  /** バー色 (デフォ: ダークネイビー) */
  color?: string;
}

/**
 * 軽量な棒グラフ。直近 N 日の売上を SVG バーで描画する。
 * react-native-svg のみ依存、外部チャートライブラリは使わない。
 *
 * 仕様:
 *  - Y軸ラベルは max のみ表示（簡素化）
 *  - X軸は MM/DD のみ
 *  - データが空 or 全て0なら "データなし" を表示
 */
export function SalesBarChart({
  data,
  width,
  height = 160,
  color = "#1a1a2e",
}: Props) {
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 24;
  const PADDING_LEFT = 48;
  const PADDING_RIGHT = 12;
  const chartW = width - PADDING_LEFT - PADDING_RIGHT;
  const chartH = height - PADDING_TOP - PADDING_BOTTOM;

  const max = Math.max(...data.map((d) => d.amount), 0);

  if (data.length === 0 || max === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text variant="bodyMedium" style={styles.emptyText}>
          売上データなし
        </Text>
      </View>
    );
  }

  const barW = (chartW / data.length) * 0.6;
  const stepX = chartW / data.length;

  return (
    <Svg width={width} height={height}>
      {/* Y軸ラベル (max のみ) */}
      <SvgText
        x={PADDING_LEFT - 8}
        y={PADDING_TOP + 4}
        fontSize={10}
        fill="#71717a"
        textAnchor="end"
      >
        {`¥${formatShort(max)}`}
      </SvgText>
      <SvgText
        x={PADDING_LEFT - 8}
        y={PADDING_TOP + chartH}
        fontSize={10}
        fill="#71717a"
        textAnchor="end"
      >
        ¥0
      </SvgText>

      {/* ベースライン */}
      <Line
        x1={PADDING_LEFT}
        y1={PADDING_TOP + chartH}
        x2={PADDING_LEFT + chartW}
        y2={PADDING_TOP + chartH}
        stroke="#e4e4e7"
        strokeWidth={1}
      />

      {/* バー & X軸ラベル */}
      {data.map((d, i) => {
        const h = (d.amount / max) * chartH;
        const x = PADDING_LEFT + stepX * i + (stepX - barW) / 2;
        const y = PADDING_TOP + chartH - h;
        const md = formatMonthDay(d.date);
        return (
          <View key={d.date}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={h}
              fill={color}
              rx={2}
            />
            <SvgText
              x={x + barW / 2}
              y={PADDING_TOP + chartH + 14}
              fontSize={10}
              fill="#71717a"
              textAnchor="middle"
            >
              {md}
            </SvgText>
          </View>
        );
      })}
    </Svg>
  );
}

function formatShort(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)}千万`;
  if (n >= 1_000_000) return `${Math.round(n / 10_000)}万`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}万`;
  return n.toLocaleString();
}

function formatMonthDay(iso: string): string {
  // ISO YYYY-MM-DD を MM/DD に
  const [, m, d] = iso.split("-");
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  emptyText: { color: "#71717a" },
});
