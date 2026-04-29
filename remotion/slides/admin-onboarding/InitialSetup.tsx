import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, Card, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const STEPS = [
  { icon: "🏪", title: "店舗情報を入力", path: "/admin/settings", desc: "店舗名・住所・電話番号・ロゴを設定します" },
  { icon: "👥", title: "スタッフを招待", path: "/admin/members", desc: "メールアドレスを入力してスタッフを招待。権限を細かく設定できます" },
  { icon: "🪪", title: "証明書テンプレートを選択", path: "/admin/template-options", desc: "ブランドに合わせたテンプレートを選んでカスタマイズします" },
  { icon: "💳", title: "プランを確認", path: "/admin/billing", desc: "14日間トライアル終了後のプランを確認・設定します" },
];

export const AdminInitialSetup: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 1</Label>
        <Heading size={60}>まず最初にやること<br /><span style={{ color: BLUE }}>初期設定 4 ステップ</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 48 }}>
          {STEPS.map((step, i) => (
            <AnimItem key={i} delay={i * 12}>
              <div style={{ display: "flex", alignItems: "center", gap: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 28px" }}>
                <span style={{ fontSize: 36 }}>{step.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>{step.title}</div>
                  <div style={{ fontSize: 18, color: TEXT_MUTED, marginTop: 4 }}>{step.desc}</div>
                </div>
                <div style={{ fontSize: 16, fontFamily: "monospace", color: BLUE, background: `${BLUE}15`, padding: "6px 14px", borderRadius: 8, whiteSpace: "nowrap" as const }}>{step.path}</div>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
