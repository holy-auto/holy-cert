import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { FONT, TEXT, TEXT_MUTED } from "../../components/shared";

const VIOLET = "#8b5cf6";

export const AgentWelcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 28 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${VIOLET}18 0%, transparent 70%)` }} />

      <div style={{ opacity: s(0), fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: VIOLET, fontFamily: "monospace", position: "relative" }}>
        代理店ポータル — Agent
      </div>
      <div style={{ opacity: s(12), transform: `scale(${s(12)})`, position: "relative" }}>
        <div style={{ fontSize: 88, fontWeight: 800, color: TEXT, letterSpacing: "-2px" }}>Ledra へ<br />ようこそ</div>
      </div>
      <div style={{ opacity: s(28), position: "relative", maxWidth: 760 }}>
        <p style={{ fontSize: 28, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          施工店を紹介してコミッションを獲得する方法を<br />ステップごとにご案内します。
        </p>
      </div>
      <div style={{ opacity: s(40), display: "flex", gap: 16, flexWrap: "wrap" as const, justifyContent: "center", position: "relative" }}>
        {["申請・承認", "紹介リンクを作成", "施工店を紹介", "コミッション確認"].map((step, i) => (
          <div key={i} style={{ padding: "10px 24px", borderRadius: 100, background: `${VIOLET}15`, border: `1px solid ${VIOLET}40`, color: TEXT_MUTED, fontSize: 20 }}>
            {i + 1}. {step}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
