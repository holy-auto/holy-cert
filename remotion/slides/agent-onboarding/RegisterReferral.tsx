import { AbsoluteFill } from "remotion";
import { FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const VIOLET = "#8b5cf6";

export const AgentRegisterReferral: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 3</Label>
        <Heading size={60}>施工店を紹介登録する<br /><span style={{ color: VIOLET }}>ステータスを追跡</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 44 }}>
          {[
            { step: "01", icon: "🤝", title: "紹介フォームに入力", desc: "/agent/referrals/new — 施工店名・担当者・電話番号・エリアを入力", color: VIOLET },
            { step: "02", icon: "📬", title: "運営がコンタクト", desc: "Ledra 運営が施工店に連絡。進捗はポータルでリアルタイム確認", color: VIOLET },
            { step: "03", icon: "✅", title: "契約成立でコミッション発生", desc: "施工店が Ledra を契約した時点でコミッションが確定", color: "#22c55e" },
            { step: "04", icon: "💰", title: "支払い完了", desc: "月次でまとめて振り込み。/agent/commissions で明細を確認", color: "#22c55e" },
          ].map((item, i) => (
            <AnimItem key={i} delay={i * 10}>
              <div style={{ display: "flex", gap: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 24px" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${item.color}20`, border: `1.5px solid ${item.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontFamily: "monospace", color: item.color, flexShrink: 0 }}>{item.step}</div>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                  <div style={{ fontSize: 18, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                </div>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
