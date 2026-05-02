import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

export const AdminV2Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18 }, durationInFrames: 22 });
  const lineW = interpolate(Math.max(0, frame - 50), [0, 35], [0, 80], { extrapolateRight: "clamp" });

  const tips = [
    "操作で迷ったら？ 右下のヘルプアイコンから",
    "設定変更は設定メニューから随時",
    "データは自動バックアップされます",
    "サポートは support@ledra.jp まで",
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

      {/* Main title */}
      <div
        style={{
          opacity: s(0),
          transform: `scale(${s(0)})`,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 100,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: "-2px",
            lineHeight: 1.1,
          }}
        >
          お疲れ様でした！
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: s(18), position: "relative", maxWidth: 720 }}>
        <p style={{ fontSize: 30, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          加盟店ポータルの基本操作を完了しました
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

      {/* Tips list */}
      <div
        style={{
          opacity: s(38),
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          alignItems: "center",
        }}
      >
        {tips.map((tip, i) => (
          <div
            key={i}
            style={{
              padding: "10px 28px",
              borderRadius: 100,
              background: `${BLUE}14`,
              border: `1px solid ${BLUE}35`,
              color: TEXT_MUTED,
              fontSize: 20,
              fontFamily: "monospace",
              opacity: s(38 + i * 8),
            }}
          >
            {tip}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          opacity: s(72),
          position: "relative",
          fontSize: 16,
          color: TEXT_DIM,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
          marginTop: 8,
        }}
      >
        Ledra — 加盟店ポータル 操作ガイド
      </div>
    </AbsoluteFill>
  );
};
