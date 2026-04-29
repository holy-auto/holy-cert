import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SlideLayout, Label, Heading, TEXT, TEXT_MUTED } from "../components/shared";

const CARDS = [
  { name: "Stripe", desc: "安全な決済・サブスク管理", icon: "💳" },
  { name: "Supabase", desc: "PostgreSQL + RLS + Realtime", icon: "🗄️" },
  { name: "Polygon BC", desc: "証明書改ざん防止アンカリング", icon: "⛓️" },
  { name: "Square", desc: "POS・売上データ連携", icon: "🏪" },
  { name: "CloudSign", desc: "電子署名・契約書管理", icon: "✍️" },
  { name: "2FA (TOTP)", desc: "Google Auth / 1Password 対応", icon: "🔐" },
];

const TAGS = ["Google Calendar", "LINE", "Resend", "Sentry", "Vercel", "Upstash Redis"];

export const TechSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>信頼の技術基盤</Label>
        <Heading size={60}>
          エンタープライズ水準の
          <br />セキュリティと信頼性
        </Heading>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 52 }}>
          {CARDS.map((c, i) => {
            const start = Math.max(0, frame - i * 8);
            const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 20 });
            return (
              <div
                key={i}
                style={{
                  opacity,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "28px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 36 }}>{c.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{c.name}</div>
                <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.4 }}>{c.desc}</div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
          {TAGS.map((tag, i) => {
            const start = Math.max(0, frame - 60 - i * 6);
            const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 16 });
            return (
              <span
                key={i}
                style={{
                  opacity,
                  fontSize: 18,
                  padding: "8px 20px",
                  borderRadius: 100,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: TEXT_MUTED,
                }}
              >
                {tag}
              </span>
            );
          })}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
