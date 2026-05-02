import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT as _FONT } from "../lib/load-fonts";

export const FONT = _FONT;

export const BLUE = "#3b82f6";
export const ACCENT = "#0071e3";
export const BG = "#060a12";
export const SURFACE = "#0d1525";
export const TEXT = "#ffffff";
export const TEXT_MUTED = "rgba(255,255,255,0.55)";

/** Slide-level padding wrapper */
export function SlideLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "96px 128px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        fontFamily: FONT,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* subtle grid */}
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
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/** Small all-caps label above headings */
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 20,
        letterSpacing: "0.25em",
        textTransform: "uppercase",
        color: BLUE,
        fontFamily: "monospace",
        marginBottom: 24,
      }}
    >
      {children}
    </div>
  );
}

/** Large heading */
export function Heading({
  children,
  size = 72,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <h1
      style={{
        fontSize: size,
        fontWeight: 700,
        color: TEXT,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      {children}
    </h1>
  );
}

/** Card surface */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 40,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Animated list item that slides in sequentially */
export function AnimItem({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - delay);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 18 });
  const x = interpolate(start, [0, 18], [-20, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, transform: `translateX(${x}px)` }}>{children}</div>
  );
}

/** Horizontal divider */
export function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "32px 0" }} />;
}
