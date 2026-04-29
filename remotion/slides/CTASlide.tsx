import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, BLUE, TEXT, TEXT_MUTED } from "../components/shared";

export const CTASlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const labelOpacity = spring({ frame, fps, config: { damping: 18 }, durationInFrames: 20 });
  const logoOpacity = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 18 }, durationInFrames: 24 });
  const logoScale = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 12 }, durationInFrames: 24 });
  const subOpacity = spring({ frame: Math.max(0, frame - 30), fps, config: { damping: 18 }, durationInFrames: 20 });
  const btnOpacity = spring({ frame: Math.max(0, frame - 44), fps, config: { damping: 18 }, durationInFrames: 20 });
  const lineW = interpolate(Math.max(0, frame - 56), [0, 30], [0, 80], { extrapolateRight: "clamp" });
  const urlOpacity = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 18 }, durationInFrames: 16 });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 28,
        background: "#060a12",
      }}
    >
      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}1a 0%, transparent 70%)`,
        }}
      />

      <div style={{ opacity: labelOpacity, position: "relative" }}>
        <span style={{ fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", color: BLUE, fontFamily: "monospace" }}>
          今すぐ始めましょう
        </span>
      </div>

      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, position: "relative" }}>
        <div style={{ fontSize: 120, fontWeight: 800, color: TEXT, letterSpacing: "-3px" }}>Ledra</div>
      </div>

      <div style={{ opacity: subOpacity, position: "relative" }}>
        <p style={{ fontSize: 30, color: TEXT_MUTED, maxWidth: 680, lineHeight: 1.6, margin: 0 }}>
          14 日間の無料トライアルで全機能をお試しいただけます。
          <br />クレジットカード不要。いつでもキャンセル可能。
        </p>
      </div>

      <div
        style={{
          opacity: btnOpacity,
          display: "flex",
          gap: 24,
          marginTop: 8,
          position: "relative",
        }}
      >
        <div
          style={{
            padding: "20px 52px",
            borderRadius: 16,
            background: "#2563eb",
            color: TEXT,
            fontWeight: 700,
            fontSize: 26,
          }}
        >
          無料で始める
        </div>
        <div
          style={{
            padding: "20px 52px",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.2)",
            color: TEXT_MUTED,
            fontWeight: 700,
            fontSize: 26,
          }}
        >
          お問い合わせ
        </div>
      </div>

      <div style={{ width: lineW, height: 2, background: "rgba(255,255,255,0.1)", borderRadius: 2, position: "relative" }} />

      <div style={{ opacity: urlOpacity, position: "relative" }}>
        <span style={{ fontSize: 22, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>ledra.jp</span>
      </div>
    </AbsoluteFill>
  );
};
