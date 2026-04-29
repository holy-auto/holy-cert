import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { FONT, TEXT, TEXT_MUTED } from "../../components/shared";

const CYAN = "#06b6d4";

export const InsurerWelcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 28 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${CYAN}18 0%, transparent 70%)` }} />

      <div style={{ opacity: s(0), fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: CYAN, fontFamily: "monospace", position: "relative" }}>
        保険会社ポータル — Insurer
      </div>
      <div style={{ opacity: s(12), transform: `scale(${s(12)})`, position: "relative" }}>
        <div style={{ fontSize: 88, fontWeight: 800, color: TEXT, letterSpacing: "-2px" }}>Ledra へ<br />ようこそ</div>
      </div>
      <div style={{ opacity: s(28), position: "relative", maxWidth: 760 }}>
        <p style={{ fontSize: 28, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          施工証明書の検索・照会から案件管理まで、<br />保険査定業務を効率化する手順をご案内します。
        </p>
      </div>
      <div style={{ opacity: s(40), display: "flex", gap: 16, flexWrap: "wrap" as const, justifyContent: "center", position: "relative" }}>
        {["証明書を検索する", "案件として登録", "チームを管理", "分析を活用"].map((step, i) => (
          <div key={i} style={{ padding: "10px 24px", borderRadius: 100, background: `${CYAN}15`, border: `1px solid ${CYAN}40`, color: TEXT_MUTED, fontSize: 20 }}>
            {i + 1}. {step}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
