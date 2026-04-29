import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout, Card } from "../../components/shared";

export const AdminFirstInvoice: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 4</Label>
        <Heading size={60}>請求書を作成する<br /><span style={{ color: BLUE }}>案件から自動引き継ぎ</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "💰", title: "案件から作成（推奨）", desc: "/admin/jobs/[id] の「請求書を作成」ボタンで顧客・車両情報が自動入力" },
              { icon: "📄", title: "直接作成", desc: "/admin/invoices から新規作成。複数案件をまとめた合算請求にも対応" },
              { icon: "🔗", title: "共有リンクで送付", desc: "PDF ダウンロードリンクを生成して LINE・メールで送れます" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 12}>
                <div style={{ display: "flex", gap: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "20px 24px" }}>
                  <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{item.title}</div>
                    <div style={{ fontSize: 17, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={36}>
            <Card>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 16 }}>ステータスの流れ</div>
              {[["下書き", "#6b7280"], ["送信済み", "#3b82f6"], ["支払済み", "#22c55e"], ["期限超過", "#ef4444"]].map(([label, color], i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  {i > 0 && <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)", marginLeft: 11, position: "absolute", marginTop: -24 }} />}
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${color}30`, border: `1.5px solid ${color}80`, flexShrink: 0 }} />
                  <span style={{ fontSize: 22, color: TEXT_MUTED }}>{label}</span>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
