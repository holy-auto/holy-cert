import { AbsoluteFill } from "remotion";
import { FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const CYAN = "#06b6d4";

export const InsurerCaseManagement: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 2</Label>
        <Heading size={60}>案件として登録・管理する<br /><span style={{ color: CYAN }}>ワンクリックで案件化</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AnimItem delay={0}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 28px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 12 }}>案件の流れ</div>
                {[["未対応", "#6b7280"], ["対応中", "#3b82f6"], ["確認済み", "#f59e0b"], ["クローズ", "#22c55e"]].map(([label, color], i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 20, color: TEXT_MUTED }}>{label}</span>
                    {i < 3 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 16 }}>→</span>}
                  </div>
                ))}
              </div>
            </AnimItem>
            <AnimItem delay={16}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px 28px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 12 }}>便利な機能</div>
                {["一括ステータス変更", "テンプレートで定型文", "自動振り分けルール", "SLA 期限アラート"].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                    <span style={{ color: CYAN, fontSize: 16 }}>✓</span>
                    <span style={{ fontSize: 20, color: TEXT_MUTED }}>{f}</span>
                  </div>
                ))}
              </div>
            </AnimItem>
          </div>
          <AnimItem delay={12}>
            <div style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}30`, borderRadius: 16, padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>施工店へのメッセージ</div>
              <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                案件詳細画面から施工店へ直接メッセージを送信できます。
                電話・メール不要でやり取りが記録として残ります。
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ fontSize: 16, color: CYAN, marginBottom: 8 }}>添付ファイル対応</div>
                <div style={{ fontSize: 18, color: TEXT_MUTED }}>査定書・写真・PDFを案件にアタッチして管理</div>
              </div>
            </div>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
