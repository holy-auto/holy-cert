import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

export const AgentV2Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (delay: number) => spring({ frame: Math.max(0, frame - delay), fps, config: { damping: 18 }, durationInFrames: 22 });
  const lineW = interpolate(Math.max(0, frame - 40), [0, 35], [0, 200], { extrapolateRight: "clamp" });

  const tips = [
    "紹介URLはSNS・LINE・名刺に活用できます",
    "トレーニング修了で報酬単価アップ！",
    "ダッシュボードで毎日進捗を確認しましょう",
    "不明点は agent-support@ledra.jp まで",
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
        gap: 32,
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
      <div style={{ opacity: s(16), position: "relative", maxWidth: 820 }}>
        <p style={{ fontSize: 30, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
          エージェントポータルの基本操作を習得しました
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

      {/* Tips */}
      <div
        style={{
          opacity: s(36),
          position: "relative",
          display: "flex",
          flexDirection: "column" as const,
          gap: 14,
          alignItems: "center",
          maxWidth: 860,
        }}
      >
        {tips.map((tip, i) => {
          const tipOpacity = spring({ frame: Math.max(0, frame - (36 + i * 10)), fps, config: { damping: 18 }, durationInFrames: 20 });
          const tipY = interpolate(Math.max(0, frame - (36 + i * 10)), [0, 20], [12, 0], { extrapolateRight: "clamp" });
          return (
            <div
              key={i}
              style={{
                opacity: tipOpacity,
                transform: `translateY(${tipY}px)`,
                padding: "10px 28px",
                borderRadius: 100,
                background: `${BLUE}14`,
                border: `1px solid ${BLUE}35`,
                color: TEXT_MUTED,
                fontSize: 20,
                lineHeight: 1.5,
              }}
            >
              {tip}
            </div>
          );
        })}
      </div>

      {/* Footer label */}
      <div
        style={{
          opacity: s(80),
          position: "relative",
          fontSize: 16,
          color: TEXT_DIM,
          fontFamily: "monospace",
          letterSpacing: "0.15em",
        }}
      >
        Ledra エージェントポータル
      </div>
    </AbsoluteFill>
  );
};
