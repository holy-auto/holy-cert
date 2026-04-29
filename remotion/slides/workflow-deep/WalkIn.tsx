import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const WorkflowWalkIn: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ワークフロー 深掘り — 3/5</Label>
        <Heading size={60}>飛び込み案件の対応<br /><span style={{ color: BLUE }}>予約なしでも即ワークフロー化</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: `${BLUE}12`, border: `1px solid ${BLUE}30`, borderRadius: 16, padding: "24px" }}>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 12 }}>/admin/jobs/new</div>
              <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                必須入力は案件タイトルのみ（デフォルトで「飛び込み案件 今日の日付」が自動入力）
              </div>
            </div>
            {[
              { icon: "🚪", label: "来店・受付", desc: "来店直後に受付として案件を作成" },
              { icon: "🔧", label: "作業中", desc: "すでに作業が始まっている場合はこちら" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 12 + 10}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                  <span style={{ fontSize: 28 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{item.label}</div>
                    <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={36}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace" }}>後から追加できるもの</div>
              {[
                ["👤", "顧客情報", "作成後に /admin/jobs/[id] で既存顧客を検索して紐付け"],
                ["🚗", "車両情報", "同様に車両も後から紐付け可能"],
                ["🪪", "証明書", "作業完了後に発行"],
                ["💰", "請求書", "顧客情報が揃ったら発行"],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: "#fff" }}>{title}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 8, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                導線: ダッシュボード「🏃 飛び込み案件」 / 予約ページヘッダー
              </div>
            </div>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
