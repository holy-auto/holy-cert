import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT, BLUE, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

const CHAPTERS = [
  "1. ログイン＆照会",
  "2. 証明書・車両確認",
  "3. 事案管理",
  "4. 分析・設定",
];

export const InsurerV2Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) =>
    spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 22 });

  const glowOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(Math.max(0, frame - 14), [0, 35], [0, 200], { extrapolateRight: "clamp" });

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
          width: 640,
          height: 640,
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
          fontSize: 18,
          letterSpacing: "0.35em",
          textTransform: "uppercase" as const,
          color: BLUE,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        保険会社ポータル — Insurer Portal
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
            fontSize: 82,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: "-2px",
            lineHeight: 1.1,
          }}
        >
          保険会社ポータル
          <br />
          <span style={{ color: BLUE }}>操作ガイド</span>
        </div>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: s(24), position: "relative", maxWidth: 860 }}>
        <p style={{ fontSize: 26, color: TEXT_MUTED, lineHeight: 1.65, margin: 0 }}>
          実際の画面で学ぶ — 証明書照会から事案管理まで
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

      {/* Chapter pills */}
      <div
        style={{
          opacity: s(36),
          display: "flex",
          gap: 14,
          flexWrap: "wrap" as const,
          justifyContent: "center",
          position: "relative",
        }}
      >
        {CHAPTERS.map((ch, i) => (
          <div
            key={i}
            style={{
              padding: "10px 26px",
              borderRadius: 100,
              background: `${BLUE}14`,
              border: `1px solid ${BLUE}38`,
              color: TEXT_MUTED,
              fontSize: 19,
              lineHeight: 1.4,
            }}
          >
            {ch}
          </div>
        ))}
      </div>

      {/* Estimated time */}
      <div
        style={{
          opacity: s(50),
          fontSize: 15,
          fontFamily: "monospace",
          color: TEXT_DIM,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          position: "relative",
        }}
      >
        約 22 分
      </div>
    </AbsoluteFill>
  );
};
