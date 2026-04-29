import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const GREEN = "#22c55e";

export const CertBlockchain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>証明書 深掘り — 4/5</Label>
        <Heading size={60}>ブロックチェーンアンカリング<br /><span style={{ color: GREEN }}>改ざん不可の証明</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 44 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
            {[
              { label: "施工写真", color: BLUE },
              { label: "SHA-256 ハッシュ生成", color: "#6b7280" },
              { label: "Polygon に記録", color: "#8b5cf6" },
              { label: "Tx Hash 取得", color: GREEN },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ padding: "10px 22px", borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}40`, color: item.color, fontSize: 20, fontWeight: 600 }}>{item.label}</div>
                  {i < 3 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 24 }}>→</span>}
                </div>
              </AnimItem>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 8 }}>
            {[
              { icon: "⛓️", title: "Polygon (Amoy)", desc: "低コスト・高速な EVM 互換ブロックチェーン。1トランザクション数円以下" },
              { icon: "🔍", title: "誰でも検証可能", desc: "Tx Hash を PolygonScan に入力すれば、誰でも記録を確認できる" },
              { icon: "♾️", title: "永続的な記録", desc: "証明書が削除されても、ブロックチェーン上のハッシュは残り続ける" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10 + 40}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 16, color: TEXT_MUTED, lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </AnimItem>
            ))}
          </div>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
