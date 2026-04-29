import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const WorkflowDuplicateGuard: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ワークフロー 深掘り — 4/5</Label>
        <Heading size={56}>重複検知 & 安全ガード<br /><span style={{ color: BLUE }}>過剰発行・二重請求を防ぐ</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AnimItem delay={0}>
              <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.3)", borderRadius: 16, padding: "24px" }}>
                <div style={{ fontSize: 19, color: "#fbbf24", marginBottom: 14 }}>証明書の重複検知</div>
                <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                  同一案件に有効な証明書が既に存在する場合、発行ボタンに<br /><span style={{ color: "#fbbf24", fontWeight: 600 }}>「(発行済)」</span>と表示され注意を促します。
                </div>
              </div>
            </AnimItem>
            <AnimItem delay={14}>
              <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: "24px" }}>
                <div style={{ fontSize: 19, color: "#86efac", marginBottom: 14 }}>請求書の重複検知</div>
                <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                  入金済みの請求書が存在する場合、請求書作成ボタンに<br /><span style={{ color: "#86efac", fontWeight: 600 }}>「(入金済あり)」</span>と表示されます。
                </div>
              </div>
            </AnimItem>
          </div>
          <AnimItem delay={28}>
            <Card>
              <div style={{ fontSize: 19, color: BLUE, fontFamily: "monospace", marginBottom: 16 }}>その他の安全設計</div>
              {[
                ["🔒", "TOCTOU 対策", "ownership チェックと UPDATE を同一クエリで実行"],
                ["👮", "テナントスコープ", "自店以外の案件・証明書には絶対アクセス不可"],
                ["📜", "操作ログ", "/admin/audit で全操作を記録・追跡可能"],
                ["🔔", "Realtime 通知", "他スタッフの操作をリアルタイムで通知"],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: "#fff" }}>{title}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 2 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
