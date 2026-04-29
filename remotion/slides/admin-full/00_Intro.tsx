import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

export const AdminFullIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18 }, durationInFrames: 22 });
  const lineW = interpolate(Math.max(0, frame - 60), [0, 35], [0, 100], { extrapolateRight: "clamp" });

  const chapters = [
    "1. ダッシュボード",
    "2. 証明書",
    "3. 車両・顧客",
    "4. 予約・案件",
    "5. 請求・会計",
    "6. BtoB",
    "7. 設定",
  ];

  return (
    <AbsoluteFill
      style={{
        background: "#060a12",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 28,
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)",
          backgroundSize: "80px 80px",
          pointerEvents: "none",
        }}
      />

      {/* Glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BLUE}1c 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Label */}
      <div
        style={{
          opacity: s(0),
          fontSize: 20,
          letterSpacing: "0.3em",
          textTransform: "uppercase" as const,
          color: BLUE,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        施工店ポータル — 完全ガイド
      </div>

      {/* Big title */}
      <div
        style={{
          opacity: s(12),
          transform: `scale(${s(12)})`,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: "-3px",
            lineHeight: 1.1,
            whiteSpace: "pre-line",
          }}
        >
          {"Admin\nポータル"}
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: s(28), position: "relative", maxWidth: 720 }}>
        <p style={{ fontSize: 28, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          ダッシュボードから設定まで、全機能を完全解説
        </p>
      </div>

      {/* Divider line */}
      <div
        style={{
          width: lineW,
          height: 2,
          background: `${BLUE}70`,
          borderRadius: 2,
          position: "relative",
        }}
      />

      {/* Chapter pills */}
      <div
        style={{
          opacity: s(44),
          position: "relative",
          display: "flex",
          flexWrap: "wrap" as const,
          gap: 12,
          justifyContent: "center",
          maxWidth: 860,
        }}
      >
        {chapters.map((ch, i) => (
          <div
            key={i}
            style={{
              padding: "8px 20px",
              borderRadius: 100,
              background: `${BLUE}18`,
              border: `1px solid ${BLUE}40`,
              color: TEXT_MUTED,
              fontSize: 18,
              fontFamily: "monospace",
            }}
          >
            {ch}
          </div>
        ))}
      </div>

      {/* Running time */}
      <div
        style={{
          opacity: s(56),
          position: "relative",
          fontSize: 18,
          color: TEXT_DIM,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
        }}
      >
        約 17 分
      </div>
    </AbsoluteFill>
  );
};
