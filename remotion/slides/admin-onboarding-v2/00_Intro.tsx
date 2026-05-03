import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, TEXT, TEXT_MUTED, TEXT_DIM } from "../../components/longform";

const ACCENT = "#60a5fa";

const chapters = [
  { no: "01", label: "ログイン\n＆ダッシュボード" },
  { no: "02", label: "証明書\n管理" },
  { no: "03", label: "車両・\n顧客管理" },
  { no: "04", label: "予約・\n整備" },
  { no: "05", label: "決済・\n請求" },
  { no: "06", label: "設定・\nチーム" },
];

export const AdminV2Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number, dur = 22) =>
    spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: dur });

  // Scanline progress bar (grows left to right)
  const barW = interpolate(frame, [30, 90], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#060a12",
        fontFamily: FONT,
        overflow: "hidden",
      }}
    >
      {/* ── Grid ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)",
        backgroundSize: "80px 80px",
        pointerEvents: "none",
      }} />

      {/* ── Central glow ── */}
      <div style={{
        position: "absolute",
        left: "50%", top: "38%",
        transform: "translate(-50%, -50%)",
        width: 900, height: 900,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${BLUE}22 0%, transparent 65%)`,
        pointerEvents: "none",
      }} />

      {/* ── Top bar: brand + duration ── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "32px 60px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        opacity: s(0, 18),
      }}>
        <div style={{
          fontSize: 15, letterSpacing: "0.35em", fontFamily: "monospace",
          color: BLUE, textTransform: "uppercase" as const,
        }}>
          LEDRA — 加盟店ポータル
        </div>
        <div style={{
          fontSize: 14, letterSpacing: "0.2em", fontFamily: "monospace",
          color: TEXT_DIM,
        }}>
          ONBOARDING GUIDE
        </div>
      </div>

      {/* ── Main title block (left-aligned) ── */}
      <div style={{
        position: "absolute",
        top: "50%", left: 60,
        transform: "translateY(-58%)",
        maxWidth: 680,
      }}>
        {/* Label */}
        <div style={{
          opacity: s(6, 20),
          fontSize: 13, letterSpacing: "0.3em", fontFamily: "monospace",
          color: ACCENT, textTransform: "uppercase" as const,
          marginBottom: 20,
        }}>
          操作ガイド
        </div>

        {/* Title */}
        <div style={{
          opacity: s(12, 26),
          transform: `translateY(${interpolate(Math.max(0, frame - 12), [0, 26], [30, 0], { extrapolateRight: "clamp" })}px)`,
        }}>
          <div style={{
            fontSize: 100,
            fontWeight: 800,
            color: TEXT,
            letterSpacing: "-4px",
            lineHeight: 1.0,
            whiteSpace: "pre-line" as const,
          }}>
            {"加盟店\nポータル"}
          </div>
        </div>

        {/* Underline */}
        <div style={{
          marginTop: 28,
          width: interpolate(Math.max(0, frame - 35), [0, 30], [0, 480], { extrapolateRight: "clamp" }),
          height: 3,
          background: `linear-gradient(to right, ${BLUE}, ${BLUE}00)`,
          borderRadius: 2,
        }} />

        {/* Subtitle */}
        <div style={{
          marginTop: 24,
          opacity: s(40, 22),
          fontSize: 22,
          color: TEXT_MUTED,
          lineHeight: 1.65,
          fontWeight: 400,
        }}>
          実際の画面で学ぶ、全機能を完全解説
        </div>

        {/* ▶ Play indicator */}
        <div style={{
          marginTop: 36,
          opacity: s(50, 22),
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 42, height: 42,
            borderRadius: "50%",
            background: BLUE,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 24px ${BLUE}70`,
          }}>
            <div style={{
              width: 0, height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderLeft: "14px solid #fff",
              marginLeft: 3,
            }} />
          </div>
          <span style={{ fontSize: 16, color: TEXT_MUTED, fontFamily: "monospace", letterSpacing: "0.1em" }}>
            約 29 分
          </span>
        </div>
      </div>

      {/* ── Chapter cards (right side) ── */}
      <div style={{
        position: "absolute",
        right: 60, top: "50%",
        transform: "translateY(-50%)",
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14,
        width: 580,
      }}>
        {chapters.map((ch, i) => {
          const op = s(30 + i * 7, 20);
          const ty = interpolate(Math.max(0, frame - 30 - i * 7), [0, 20], [18, 0], { extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              opacity: op,
              transform: `translateY(${ty}px)`,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "18px 16px",
            }}>
              <div style={{
                fontSize: 28, fontWeight: 800,
                color: BLUE, fontFamily: "monospace",
                letterSpacing: "-1px",
                lineHeight: 1,
                marginBottom: 10,
              }}>
                {ch.no}
              </div>
              <div style={{
                fontSize: 14,
                color: TEXT_MUTED,
                lineHeight: 1.5,
                whiteSpace: "pre-line" as const,
                fontWeight: 500,
              }}>
                {ch.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Bottom progress bar ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
        background: "rgba(255,255,255,0.06)",
      }}>
        <div style={{
          height: "100%",
          width: `${barW}%`,
          background: `linear-gradient(to right, ${BLUE}, ${ACCENT})`,
          boxShadow: `0 0 12px ${BLUE}`,
        }} />
      </div>
    </AbsoluteFill>
  );
};
