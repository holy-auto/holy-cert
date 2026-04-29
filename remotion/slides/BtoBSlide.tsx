import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SlideLayout, Label, Heading, Card, TEXT, TEXT_MUTED } from "../components/shared";

const VIOLET = "#8b5cf6";
const STEPS = ["問い合わせ", "見積もり", "発注", "作業実施", "完了・レビュー", "ランク反映"];

export const BtoBSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shopAOpacity = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18 }, durationInFrames: 20 });
  const arrowOpacity = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 18 }, durationInFrames: 16 });
  const shopBOpacity = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 18 }, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>主要機能 4</Label>
        <Heading size={60}>
          BtoB マーケットプレイス
          <br />
          <span style={{ color: VIOLET }}>施工店同士をつなぐ</span>
        </Heading>

        <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 52 }}>
          <div
            style={{
              opacity: shopAOpacity,
              flex: 1,
              background: `${VIOLET}18`,
              border: `1px solid ${VIOLET}40`,
              borderRadius: 20,
              padding: 36,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 10 }}>施工店 A</div>
            <div style={{ fontSize: 20, color: TEXT_MUTED }}>得意分野・空き情報を掲載</div>
          </div>

          <div style={{ opacity: arrowOpacity, fontSize: 48, color: "rgba(255,255,255,0.3)" }}>⇄</div>

          <div
            style={{
              opacity: shopBOpacity,
              flex: 1,
              background: `${VIOLET}18`,
              border: `1px solid ${VIOLET}40`,
              borderRadius: 20,
              padding: 36,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 10 }}>施工店 B</div>
            <div style={{ fontSize: 20, color: TEXT_MUTED }}>検索・問い合わせ・発注</div>
          </div>
        </div>

        <Card style={{ marginTop: 36 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            {STEPS.map((step, i) => {
              const start = Math.max(0, frame - 40 - i * 8);
              const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 16 });
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity }}>
                  <span
                    style={{
                      fontSize: 20,
                      padding: "8px 20px",
                      borderRadius: 100,
                      background: `${VIOLET}18`,
                      border: `1px solid ${VIOLET}40`,
                      color: "#c4b5fd",
                    }}
                  >
                    {step}
                  </span>
                  {i < STEPS.length - 1 && (
                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 20 }}>→</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <p style={{ fontSize: 22, color: TEXT_MUTED, lineHeight: 1.6, marginTop: 32 }}>
          パートナーランク（プラチナ / ゴールド / シルバー / ブロンズ）で実績が可視化され、
          信頼できる施工店との取引を促進します。
        </p>
      </SlideLayout>
    </AbsoluteFill>
  );
};
