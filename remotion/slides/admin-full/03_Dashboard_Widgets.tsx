import { AbsoluteFill } from "remotion";
import {
  LongFormLayout,
  Label,
  Heading,
  BulletList,
  AnimItem,
  FadeIn,
  Tip,
  FONT,
  TEXT,
  TEXT_MUTED,
  BLUE,
} from "../../components/longform";

const WIDGET_ITEMS = [
  "右上の「編集」ボタンでカスタマイズモードに切り替え",
  "各ウィジェットの表示 / 非表示をトグルで切り替え",
  "ドラッグで並び替え可能",
  "設定はブラウザではなくサーバーに保存（複数端末で共有）",
];

const QUICK_ACTIONS = [
  { icon: "📋", label: "証明書一覧" },
  { icon: "🪪", label: "新規発行" },
  { icon: "👤", label: "顧客管理" },
  { icon: "💰", label: "請求書" },
  { icon: "💳", label: "課金管理" },
  { icon: "🏃", label: "飛び込み案件" },
];

export const DashboardWidgets: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <LongFormLayout slideNo={4} total={25}>
        <Label>ダッシュボード</Label>
        <Heading size={56}>ウィジェット & クイックアクション</Heading>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            marginTop: 36,
            alignItems: "start",
          }}
        >
          {/* Left: Widget customization */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimItem delay={0}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: TEXT,
                  marginBottom: 8,
                }}
              >
                ウィジェットカスタマイズ
              </div>
            </AnimItem>
            <BulletList items={WIDGET_ITEMS} startDelay={4} gap={12} />
          </div>

          {/* Right: Quick actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <AnimItem delay={8}>
              <div style={{ fontSize: 20, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
                クイックアクション
              </div>
            </AnimItem>

            <AnimItem delay={16}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                {QUICK_ACTIONS.map((action, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      padding: "14px 10px",
                      display: "flex",
                      flexDirection: "column" as const,
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{action.icon}</span>
                    <span style={{ fontSize: 16, color: TEXT_MUTED, textAlign: "center" as const }}>
                      {action.label}
                    </span>
                  </div>
                ))}
              </div>
            </AnimItem>

            <FadeIn delay={32}>
              <Tip>
                Cmd+K（コマンドパレット）を使うと、ページ名を入力するだけで即座に遷移できます
              </Tip>
            </FadeIn>
          </div>
        </div>
      </LongFormLayout>
    </AbsoluteFill>
  );
};
