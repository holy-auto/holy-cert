import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONT, BG, TEXT, TEXT_MUTED, BLUE } from "./longform";

export interface HighlightBox {
  /** CSS left relative to the screenshot container, e.g. "30%" */
  x: string;
  /** CSS top relative to the screenshot container, e.g. "20%" */
  y: string;
  width: string;
  height: string;
  label?: string;
  color?: string;
}

interface ScreenshotSlideProps {
  /** Path relative to public/, e.g. "screenshots/admin/dashboard.png" */
  file: string;
  title: string;
  /** Short step label, e.g. "Step 1" or "手順 1" */
  step?: string;
  description: string;
  subtext?: string;
  highlights?: HighlightBox[];
}

class ImgFallback extends React.Component<
  { src: string; style?: React.CSSProperties; file: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: "100%",
          height: 620,
          background: "rgba(255,255,255,0.04)",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          ...this.props.style,
        }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>📸</div>
          <div style={{ fontFamily: "monospace", fontSize: 16, color: "rgba(255,255,255,0.3)" }}>
            {this.props.file}
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.2)" }}>
            Run: npx tsx scripts/capture-screenshots.ts
          </div>
        </div>
      );
    }
    return <Img src={this.props.src} style={this.props.style} />;
  }
}

export function ScreenshotSlide({
  file,
  title,
  step,
  description,
  subtext,
  highlights = [],
}: ScreenshotSlideProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeImg = spring({ frame, fps, config: { damping: 20 }, durationInFrames: 25 });
  const fadeBar = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 20 },
    durationInFrames: 25,
  });
  const barY = interpolate(Math.max(0, frame - 12), [0, 25], [24, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: BG,
      fontFamily: FONT,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Screenshot region */}
      <div style={{
        flex: 1,
        padding: "28px 28px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeImg,
        position: "relative",
        minHeight: 0,
      }}>
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <ImgFallback
            src={staticFile(file)}
            file={file}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "top center",
              borderRadius: 10,
              boxShadow: "0 6px 48px rgba(0,0,0,0.7)",
              display: "block",
            }}
          />

          {/* Animated highlight overlays */}
          {highlights.map((h, i) => {
            const d = 22 + i * 10;
            const ho = spring({ frame: Math.max(0, frame - d), fps, config: { damping: 18 }, durationInFrames: 15 });
            const color = h.color ?? "#ef4444";
            return (
              <div key={i} style={{
                position: "absolute",
                left: h.x,
                top: h.y,
                width: h.width,
                height: h.height,
                border: `3px solid ${color}`,
                borderRadius: 6,
                boxShadow: `0 0 0 3px ${color}30, inset 0 0 0 1px ${color}20`,
                opacity: ho,
                pointerEvents: "none",
              }}>
                {h.label && (
                  <div style={{
                    position: "absolute",
                    bottom: "calc(100% + 6px)",
                    left: 0,
                    background: color,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: 4,
                    whiteSpace: "nowrap" as const,
                    fontFamily: "monospace",
                    letterSpacing: "0.05em",
                  }}>
                    {h.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Info bar */}
      <div style={{
        flexShrink: 0,
        padding: "18px 48px 24px",
        background: "linear-gradient(to top, rgba(6,10,18,0.97) 80%, rgba(6,10,18,0.7))",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        opacity: fadeBar,
        transform: `translateY(${barY}px)`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          {step && (
            <span style={{
              fontSize: 12,
              fontFamily: "monospace",
              color: BLUE,
              letterSpacing: "0.18em",
              textTransform: "uppercase" as const,
              background: `${BLUE}18`,
              border: `1px solid ${BLUE}35`,
              padding: "3px 12px",
              borderRadius: 100,
            }}>
              {step}
            </span>
          )}
          <span style={{ fontSize: 26, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>{title}</span>
        </div>
        <p style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.65, margin: 0, maxWidth: 1400 }}>
          {description}
        </p>
        {subtext && (
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.32)", lineHeight: 1.6, margin: "8px 0 0" }}>
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
