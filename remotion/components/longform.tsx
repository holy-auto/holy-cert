import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const FONT = "'Noto Sans CJK JP', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', sans-serif";
export const BLUE = "#3b82f6";
export const ACCENT = "#0071e3";
export const BG = "#060a12";
export const TEXT = "#ffffff";
export const TEXT_MUTED = "rgba(255,255,255,0.55)";
export const TEXT_DIM = "rgba(255,255,255,0.3)";

// ─── Layout ───────────────────────────────────────────────────────────

export function SlideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "100%", padding: "96px 128px", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box", position: "relative" }}>
      <GridBg />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/** Dense layout for long-form — smaller padding, more space for content */
export function LongFormLayout({ children, slideNo, total }: { children: React.ReactNode; slideNo?: number; total?: number }) {
  return (
    <div style={{ width: "100%", height: "100%", padding: "64px 100px", display: "flex", flexDirection: "column", justifyContent: "center", boxSizing: "border-box", position: "relative" }}>
      <GridBg />
      {slideNo != null && total != null && (
        <div style={{ position: "absolute", top: 24, right: 36, fontSize: 14, fontFamily: "monospace", color: TEXT_DIM, zIndex: 2 }}>
          {slideNo} / {total}
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

function GridBg() {
  return (
    <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)", backgroundSize: "80px 80px", pointerEvents: "none" }} />
  );
}

// ─── Typography ───────────────────────────────────────────────────────

export function Label({ children, color }: { children: React.ReactNode; color?: string }) {
  return <div style={{ fontSize: 18, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: color ?? BLUE, fontFamily: "monospace", marginBottom: 20 }}>{children}</div>;
}

export function Heading({ children, size = 68 }: { children: React.ReactNode; size?: number }) {
  return <h1 style={{ fontSize: size, fontWeight: 700, color: TEXT, lineHeight: 1.15, margin: "0 0 0 0" }}>{children}</h1>;
}

// ─── Cards & containers ───────────────────────────────────────────────

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 36, ...style }}>{children}</div>;
}

/** Compact card for long-form layouts */
export function SmallCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 22px", ...style }}>{children}</div>;
}

/** Highlighted tip / note box */
export function Tip({ children, color = BLUE }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ background: `${color}10`, border: `1px solid ${color}35`, borderRadius: 12, padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 18, color, flexShrink: 0, marginTop: 2 }}>💡</span>
      <span style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.55 }}>{children}</span>
    </div>
  );
}

/** Warning box */
export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 12, padding: "14px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ fontSize: 18, color: "#fbbf24", flexShrink: 0, marginTop: 2 }}>⚠️</span>
      <span style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.55 }}>{children}</span>
    </div>
  );
}

/** Code / path tag */
export function Path({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: "monospace", fontSize: 16, background: `${BLUE}18`, color: BLUE, padding: "3px 10px", borderRadius: 6 }}>{children}</span>;
}

// ─── Chapter divider ──────────────────────────────────────────────────

export function ChapterDivider({ chapter, title, sub, color = BLUE }: { chapter: string; title: string; sub?: string; color?: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = (d: number) => spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 22 });
  const lineW = interpolate(Math.max(0, frame - 10), [0, 30], [0, 120], { extrapolateRight: "clamp" });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 24, position: "relative" }}>
      <GridBg />
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${color}1a 0%, transparent 70%)` }} />

      <div style={{ opacity: s(0), fontSize: 18, letterSpacing: "0.4em", fontFamily: "monospace", color, textTransform: "uppercase" as const, position: "relative" }}>{chapter}</div>
      <div style={{ opacity: s(10), transform: `scale(${s(10)})`, position: "relative" }}>
        <div style={{ fontSize: 80, fontWeight: 800, color: TEXT, letterSpacing: "-2px" }}>{title}</div>
      </div>
      {sub && <div style={{ opacity: s(24), fontSize: 26, color: TEXT_MUTED, position: "relative" }}>{sub}</div>}
      <div style={{ width: lineW, height: 2, background: `${color}60`, borderRadius: 2, position: "relative" }} />
    </div>
  );
}

// ─── Animated items ────────────────────────────────────────────────────

export function AnimItem({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - delay);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 18 });
  const x = interpolate(start, [0, 18], [-16, 0], { extrapolateRight: "clamp" });
  return <div style={{ opacity, transform: `translateX(${x}px)` }}>{children}</div>;
}

export function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - delay);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 20 });
  const y = interpolate(start, [0, 20], [16, 0], { extrapolateRight: "clamp" });
  return <div style={{ opacity, transform: `translateY(${y}px)` }}>{children}</div>;
}

// ─── Bullet list helper ────────────────────────────────────────────────

export function BulletList({ items, color = BLUE, startDelay = 0, gap = 10 }: { items: string[]; color?: string; startDelay?: number; gap?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map((item, i) => (
        <AnimItem key={i} delay={startDelay + i * 8}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, opacity: 0.7, flexShrink: 0, marginTop: 9 }} />
            <span style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.5 }}>{item}</span>
          </div>
        </AnimItem>
      ))}
    </div>
  );
}
