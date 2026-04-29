import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  AnimItem,
  FadeIn,
  SmallCard,
  Tip,
  FONT,
  TEXT,
  TEXT_MUTED,
  BLUE,
} from "../../components/longform";

const TABS = [
  { icon: "🚗", label: "車両タブ", detail: "保有車両一覧・新規登録へのリンク" },
  { icon: "🪪", label: "証明書タブ", detail: "発行済み証明書一覧・発行ボタン" },
  { icon: "🗓️", label: "予約・案件タブ", detail: "予約履歴・進行中案件" },
  { icon: "💰", label: "請求タブ", detail: "請求書一覧・作成ボタン" },
];

const QUICK_ACTIONS = [
  { action: "「+ 車両登録」", detail: "顧客コンテキスト維持で車両登録" },
  { action: "「🪪 証明書発行」", detail: "顧客ID を引き継いで発行フローへ" },
  { action: "「🏃 飛び込み案件」", detail: "この顧客の案件をすぐ開始" },
  { action: "「💰 請求書作成」", detail: "顧客情報引き継ぎで請求書作成" },
];

export const Customer360: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={12} total={25}>
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
              <Label>顧客管理 /admin/customers/[id]</Label>
              <Heading size={50}>顧客 360° ビュー</Heading>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {TABS.map((tab, i) => (
                <AnimItem key={i} delay={i * 10}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 14,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "14px 18px",
                    }}
                  >
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{tab.icon}</span>
                    <div>
                      <div style={{ fontSize: 19, fontWeight: 600, color: TEXT, marginBottom: 4 }}>
                        {tab.label}
                      </div>
                      <div style={{ fontSize: 17, color: TEXT_MUTED, lineHeight: 1.5 }}>
                        {tab.detail}
                      </div>
                    </div>
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
                    marginBottom: 16,
                  }}
                >
                  タブ右上のクイックアクション
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {QUICK_ACTIONS.map((qa, i) => (
                    <div
                      key={i}
                      style={{ display: "flex", flexDirection: "column", gap: 2 }}
                    >
                      <div style={{ fontSize: 17, color: TEXT, fontWeight: 600 }}>
                        {qa.action}
                      </div>
                      <div style={{ fontSize: 16, color: TEXT_MUTED, lineHeight: 1.5 }}>
                        → {qa.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </SmallCard>
            </AnimItem>

            <FadeIn delay={36}>
              <Tip>
                データは Promise.all で並列取得するため、タブ切り替えに待ち時間がほぼ発生しません
              </Tip>
            </FadeIn>
          </div>
        </div>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
