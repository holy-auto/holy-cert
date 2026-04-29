import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const WorkflowContextCarryover: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ワークフロー 深掘り — 5/5</Label>
        <Heading size={56}>コンテキスト自動引き継ぎ<br /><span style={{ color: BLUE }}>再入力ゼロの仕組み</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 44 }}>
          <AnimItem delay={0}>
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 16, padding: "22px 28px" }}>
              <div style={{ fontSize: 19, color: BLUE, fontFamily: "monospace", marginBottom: 10 }}>URL パラメータで情報を引き継ぐ</div>
              <div style={{ fontFamily: "monospace", fontSize: 20, color: "#86efac", background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: "12px 16px" }}>
                /admin/certificates/new?<span style={{ color: "#fbbf24" }}>vehicle_id</span>=xxx&<span style={{ color: "#f9a8d4" }}>customer_id</span>=yyy
              </div>
              <div style={{ fontSize: 17, color: TEXT_MUTED, marginTop: 10 }}>案件ワークフローから証明書発行ページへ遷移するとき、車両IDと顧客IDが自動でセットされる</div>
            </div>
          </AnimItem>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              { from: "案件", to: "証明書発行", carries: ["vehicle_id", "customer_id"], color: BLUE },
              { from: "案件", to: "請求書作成", carries: ["customer_id", "reservation_id", "金額情報"], color: "#8b5cf6" },
              { from: "顧客詳細", to: "証明書 / 案件", carries: ["customer_id", "顧客名"], color: "#06b6d4" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 12 + 20}>
                <Card style={{ padding: "20px 22px" }}>
                  <div style={{ fontSize: 16, color: item.color, fontFamily: "monospace", marginBottom: 8 }}>{item.from} → {item.to}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {item.carries.map((c, j) => (
                      <div key={j} style={{ fontSize: 16, color: TEXT_MUTED, display: "flex", gap: 8 }}>
                        <span style={{ color: item.color }}>▸</span>{c}
                      </div>
                    ))}
                  </div>
                </Card>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={56}>
            <div style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.6, padding: "16px 24px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
              顧客 360° ビュー（/admin/customers/[id]）でも同様に、車両・証明書・予約・請求タブから各アクションボタンに顧客 ID が引き継がれます。
            </div>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
