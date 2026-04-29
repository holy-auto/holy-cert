import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, BLUE, TEXT, TEXT_MUTED } from "../components/shared";

export const TitleSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoOpacity = spring({ frame, fps, config: { damping: 18 }, durationInFrames: 30 });
  const logoScale = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 30 });

  const labelOpacity = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 18 }, durationInFrames: 24 });
  const subOpacity = spring({ frame: Math.max(0, frame - 36), fps, config: { damping: 18 }, durationInFrames: 24 });
  const lineW = interpolate(Math.max(0, frame - 50), [0, 30], [0, 80], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 24,
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

      {/* Blue glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      <div style={{ opacity: labelOpacity, position: "relative" }}>
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: BLUE,
            fontFamily: "monospace",
          }}
        >
          WEB 施工証明書 SaaS
        </div>
      </div>

      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          position: "relative",
        }}
      >
        <div style={{ fontSize: 140, fontWeight: 800, color: TEXT, letterSpacing: "-4px" }}>
          Ledra
        </div>
      </div>

      <div style={{ opacity: subOpacity, position: "relative" }}>
        <div style={{ fontSize: 36, color: TEXT_MUTED, fontWeight: 300 }}>
          施工の証明を、デジタルで。
        </div>
      </div>

      <div
        style={{
          width: lineW,
          height: 2,
          background: `${BLUE}80`,
          borderRadius: 2,
          marginTop: 24,
          position: "relative",
        }}
      />
    </AbsoluteFill>
  );
};
