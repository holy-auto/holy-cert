import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { SlideLayout, Label, Heading, Card, TEXT, TEXT_MUTED } from "../components/shared";

const FEATURES = [
  { icon: "📄", label: "証明書一括検索" },
  { icon: "📋", label: "案件管理" },
  { icon: "⏱️", label: "SLA 自動管理" },
  { icon: "📊", label: "CSV / PDF 出力" },
  { icon: "🤖", label: "自動振り分けルール" },
  { icon: "👁️", label: "ウォッチリスト" },
];

const CYAN = "#06b6d4";

export const InsurerSlide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const searchOpacity = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18 }, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ background: "#060a12" }}>
      <SlideLayout>
        <Label>主要機能 3</Label>
        <Heading size={60}>
          保険会社ポータル
          <br />
          <span style={{ color: CYAN }}>証明書を即座に照会</span>
        </Heading>

        <Card style={{ marginTop: 48 }}>
          {/* Search bar */}
          <div
            style={{
              opacity: searchOpacity,
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "16px 24px",
              marginBottom: 28,
            }}
          >
            <span style={{ fontSize: 24, opacity: 0.4 }}>🔍</span>
            <span style={{ fontSize: 22, color: "rgba(255,255,255,0.35)" }}>
              証明書番号 / 顧客名 / 車両ナンバーで検索…
            </span>
          </div>

          {/* Feature grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {FEATURES.map((f, i) => {
              const start = Math.max(0, frame - 20 - i * 8);
              const opacity = spring({ frame: start, fps, config: { damping: 18 }, durationInFrames: 18 });
              return (
                <div
                  key={i}
                  style={{
                    opacity,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    fontSize: 22,
                    color: TEXT_MUTED,
                  }}
                >
                  <span style={{ fontSize: 24 }}>{f.icon}</span>
                  {f.label}
                </div>
              );
            })}
          </div>
        </Card>

        <p style={{ fontSize: 22, color: TEXT_MUTED, lineHeight: 1.6, marginTop: 36 }}>
          保険金請求時の施工実績確認が専用ポータルで数秒で完了。
          施工店とのコミュニケーションコストを大幅に削減します。
        </p>
      </SlideLayout>
    </AbsoluteFill>
  );
};
