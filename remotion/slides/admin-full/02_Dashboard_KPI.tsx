import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  AnimItem,
  SmallCard,
  Tip,
  FONT,
  TEXT,
  TEXT_MUTED,
  TEXT_DIM,
  BLUE,
} from "../../components/longform";

const KPI_ITEMS = [
  "証明書数（合計 / 有効 / 無効）",
  "メンバー数 / 顧客数",
  "請求書数 / 未回収額",
  "本日の予約数 / 進行中の予約",
  "BtoB 進行中の受発注件数",
  "30日間発行推移チャート",
];

const RANKS = [
  { label: "プラチナ", color: "#e2e8f0" },
  { label: "ゴールド", color: "#f59e0b" },
  { label: "シルバー", color: "#94a3b8" },
  { label: "ブロンズ", color: "#b45309" },
  { label: "スターター", color: "#6b7280" },
];

export const DashboardKPI: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={3} total={25}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div>
              <Label>ダッシュボード /admin</Label>
              <Heading size={52}>KPI カードと統計を読む</Heading>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              {KPI_ITEMS.map((item, i) => (
                <AnimItem key={i} delay={i * 8}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: BLUE,
                        opacity: 0.7,
                        flexShrink: 0,
                        marginTop: 9,
                      }}
                    />
                    <span style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.5 }}>{item}</span>
                  </div>
                </AnimItem>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimItem delay={16}>
              <SmallCard>
                <div
                  style={{
                    fontSize: 16,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase" as const,
                    color: BLUE,
                    fontFamily: "monospace",
                    marginBottom: 14,
                  }}
                >
                  パートナーランク
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {RANKS.map((rank) => (
                    <div
                      key={rank.label}
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: rank.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 19, color: TEXT_MUTED }}>{rank.label}</span>
                    </div>
                  ))}
                </div>
              </SmallCard>
            </AnimItem>

            <AnimItem delay={28}>
              <Tip>
                運営権限のあるアカウントでは、プラットフォーム全体の統計（全体証明書数・業種別/地域別施工店分布）も閲覧できます
              </Tip>
            </AnimItem>
          </div>
        </div>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
