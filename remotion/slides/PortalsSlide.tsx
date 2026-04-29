import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SlideLayout, Label, Heading, TEXT, TEXT_MUTED } from "../components/shared";

const PORTALS = [
  {
    role: "Admin",
    label: "施工店",
    color: "#3b82f6",
    items: ["証明書発行", "予約管理", "請求・会計", "BtoB受発注"],
  },
  {
    role: "Agent",
    label: "代理店",
    color: "#8b5cf6",
    items: ["紹介管理", "コミッション", "ランキング", "研修"],
  },
  {
    role: "Insurer",
    label: "保険会社",
    color: "#06b6d4",
    items: ["証明書照会", "案件管理", "SLA管理", "分析"],
  },
  {
    role: "Customer",
    label: "顧客",
    color: "#10b981",
    items: ["証明書閲覧", "QRアクセス", "PDF出力", "マイページ"],
  },
];

function PortalCard({
  portal,
  delay,
}: {
  portal: (typeof PORTALS)[0];
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = Math.max(0, frame - delay);
  const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 24 });
  const y = 1 - opacity;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y * 32}px)`,
        background: `${portal.color}18`,
        border: `1px solid ${portal.color}44`,
        borderRadius: 20,
        padding: "36px 32px",
        flex: 1,
      }}
    >
      <div style={{ fontSize: 18, letterSpacing: "0.2em", fontFamily: "monospace", color: portal.color, marginBottom: 8 }}>
        {portal.role}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: TEXT, marginBottom: 24 }}>{portal.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {portal.items.map((item) => (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: portal.color, opacity: 0.6 }} />
            <span style={{ fontSize: 22, color: TEXT_MUTED }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PortalsSlide: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>プラットフォーム構成</Label>
        <Heading size={60}>
          4 つのポータルで
          <br />全ユーザーをカバー
        </Heading>
        <div style={{ display: "flex", gap: 24, marginTop: 52 }}>
          {PORTALS.map((p, i) => (
            <PortalCard key={p.role} portal={p} delay={i * 10} />
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
