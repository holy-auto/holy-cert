import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const CYAN = "#06b6d4";

export const InsurerSearchCertificate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const barOpacity = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18 }, durationInFrames: 20 });
  const cursorW = interpolate(Math.max(0, frame - 10), [0, 40], [0, 260], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 1</Label>
        <Heading size={60}>証明書を検索する<br /><span style={{ color: CYAN }}>3つの検索キー</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, marginTop: 44, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔢", key: "証明書番号 (public_id)", ex: "例: LC-20260401-XXXX" },
              { icon: "👤", key: "顧客名 / フリガナ", ex: "例: 山田 太郎" },
              { icon: "🚗", key: "車両ナンバー / 型式", ex: "例: 品川 300 あ 1234" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 12}>
                <div style={{ display: "flex", gap: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 22px" }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{item.key}</div>
                    <div style={{ fontSize: 17, color: TEXT_MUTED, marginTop: 4 }}>{item.ex}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={36}>
            <Card>
              <div style={{ fontSize: 18, color: CYAN, fontFamily: "monospace", marginBottom: 16 }}>検索結果で確認できること</div>
              {["施工内容・使用材料", "ビフォーアフター写真", "施工店情報・連絡先", "施工日・証明書ステータス", "ブロックチェーン真正性記録"].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: CYAN, opacity: 0.7, flexShrink: 0 }} />
                  <span style={{ fontSize: 20, color: TEXT_MUTED }}>{item}</span>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
