import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, TEXT, TEXT_MUTED } from "../../components/shared";

export const AdminWelcome: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18 }, durationInFrames: 22 });

  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 28 }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: `radial-gradient(circle, ${BLUE}20 0%, transparent 70%)` }} />

      <div style={{ opacity: s(0), fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: BLUE, fontFamily: "monospace", position: "relative" }}>
        施工店ポータル — Admin
      </div>
      <div style={{ opacity: s(12), transform: `scale(${s(12)})`, position: "relative" }}>
        <div style={{ fontSize: 96, fontWeight: 800, color: TEXT, letterSpacing: "-2px" }}>Ledra へ<br />ようこそ</div>
      </div>
      <div style={{ opacity: s(28), position: "relative", maxWidth: 700 }}>
        <p style={{ fontSize: 30, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          このビデオでは、Ledra Admin ポータルの<br />はじめの設定から最初の証明書発行まで案内します。
        </p>
      </div>
      <div style={{ opacity: s(40), position: "relative", display: "flex", gap: 16, marginTop: 8 }}>
        {["初期設定", "顧客・車両登録", "証明書発行", "請求書作成"].map((step, i) => (
          <div key={i} style={{ padding: "10px 24px", borderRadius: 100, background: `${BLUE}18`, border: `1px solid ${BLUE}40`, color: TEXT_MUTED, fontSize: 20 }}>
            {i + 1}. {step}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
