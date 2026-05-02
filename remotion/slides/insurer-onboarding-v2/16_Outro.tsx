import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT, BLUE, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

const TIPS = [
  "照会は1日何件でも無制限",
  "事案のSLAアラートを設定しておきましょう",
  "月次レポートの自動送信を設定すると便利です",
  "サポート: support@ledra.jp",
];

export const InsurerV2Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) =>
    spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 22 });

  const glowOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(Math.max(0, frame - 16), [0, 35], [0, 160], { extrapolateRight: "clamp" });

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
        gap: 30,
        overflow: "hidden",
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

      {/* BLUE glow circle */}
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${BLUE}1c 0%, transparent 70%)`,
          opacity: glowOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Label */}
      <div
        style={{
          opacity: s(0),
          fontSize: 17,
          letterSpacing: "0.35em",
          textTransform: "uppercase" as const,
          color: BLUE,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        Complete — 完了
      </div>

      {/* Main title */}
      <div
        style={{
          opacity: s(10),
          transform: `scale(${s(10)})`,
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 86,
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
      <div style={{ opacity: s(22), position: "relative", maxWidth: 820 }}>
        <p style={{ fontSize: 26, color: TEXT_MUTED, lineHeight: 1.65, margin: 0 }}>
          保険会社ポータルの基本操作を習得しました
        </p>
      </div>

      {/* Divider line */}
      <div
        style={{
          width: lineW,
          height: 2,
          background: `${BLUE}60`,
          borderRadius: 2,
          position: "relative",
        }}
      />

      {/* Tips */}
      <div
        style={{
          opacity: s(34),
          display: "flex",
          flexDirection: "column" as const,
          gap: 14,
          alignItems: "center",
          position: "relative",
          maxWidth: 780,
          width: "100%",
        }}
      >
        {TIPS.map((tip, i) => {
          const tipOpacity = s(34 + i * 8);
          const tipX = interpolate(Math.max(0, frame - (34 + i * 8)), [0, 22], [-14, 0], {
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                opacity: tipOpacity,
                transform: `translateX(${tipX}px)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 28px",
                borderRadius: 100,
                background: `${BLUE}10`,
                border: `1px solid ${BLUE}30`,
                width: "100%",
                boxSizing: "border-box" as const,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: BLUE,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 19, color: TEXT_MUTED, lineHeight: 1.5 }}>{tip}</span>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div
        style={{
          opacity: s(68),
          fontSize: 14,
          fontFamily: "monospace",
          color: TEXT_DIM,
          letterSpacing: "0.12em",
          position: "relative",
        }}
      >
        Ledra — 保険会社ポータル v2
      </div>
    </AbsoluteFill>
  );
};
