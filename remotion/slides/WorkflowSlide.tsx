import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SlideLayout, Label, Heading, Card, TEXT, TEXT_MUTED, BLUE } from "../components/shared";

const STATUSES = ["予約確定", "来店", "作業中", "完了"];

const CARDS = [
  { icon: "🪪", title: "証明書発行", desc: "車両・顧客情報を自動引き継ぎ。重複発行防止機能付き" },
  { icon: "💰", title: "請求書作成", desc: "案件情報から自動反映。PDF 生成・共有リンク発行" },
  { icon: "🏃", title: "飛び込み案件", desc: "/jobs/new から数秒でワークフローに合流" },
];

export const WorkflowSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>主要機能 2</Label>
        <Heading size={60}>
          案件ワークフロー
          <br />
          <span style={{ color: BLUE }}>予約から請求まで 1 画面</span>
        </Heading>

        {/* Status stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 48 }}>
          {STATUSES.map((s, i) => {
            const start = Math.max(0, frame - i * 14);
            const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 18 });
            const isLast = i === STATUSES.length - 1;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, opacity }}>
                <div
                  style={{
                    padding: "12px 28px",
                    borderRadius: 12,
                    background: isLast ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${isLast ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.1)"}`,
                    color: isLast ? "#86efac" : TEXT_MUTED,
                    fontSize: 26,
                    fontWeight: 600,
                  }}
                >
                  {s}
                </div>
                {!isLast && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 28 }}>→</span>}
              </div>
            );
          })}
        </div>

        {/* Feature cards */}
        <div style={{ display: "flex", gap: 24, marginTop: 48 }}>
          {CARDS.map((card, i) => {
            const start = Math.max(0, frame - 40 - i * 12);
            const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 20 });
            const y = interpolate(start, [0, 20], [24, 0], { extrapolateRight: "clamp" });
            return (
              <div
                key={i}
                style={{
                  opacity,
                  transform: `translateY(${y}px)`,
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 20,
                  padding: 36,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ fontSize: 40 }}>{card.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>{card.title}</div>
                <div style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            );
          })}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
