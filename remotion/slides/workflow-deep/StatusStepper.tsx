import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const WorkflowStatusStepper: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ワークフロー 深掘り — 2/5</Label>
        <Heading size={60}>ステータス管理の詳細<br /><span style={{ color: BLUE }}>1クリックで次へ進む</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 44 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" as const }}>
            {[
              { status: "confirmed", label: "予約確定", color: "#3b82f6", desc: "予約登録直後" },
              { status: "arrived", label: "来店", color: "#f59e0b", desc: "チェックインボタン" },
              { status: "in_progress", label: "作業中", color: "#8b5cf6", desc: "作業開始ボタン" },
              { status: "completed", label: "完了", color: "#22c55e", desc: "作業完了ボタン" },
            ].map((s, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "center" as const }}>
                    <div style={{ padding: "12px 24px", borderRadius: 12, background: `${s.color}18`, border: `1.5px solid ${s.color}50`, color: s.color, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: TEXT_MUTED, fontFamily: "monospace" }}>{s.desc}</div>
                  </div>
                  {i < 3 && <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 24, marginBottom: 20 }}>→</span>}
                </div>
              </AnimItem>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <AnimItem delay={44}>
              <Card>
                <div style={{ fontSize: 19, color: BLUE, fontFamily: "monospace", marginBottom: 12 }}>モバイル API との連携</div>
                {["PATCH /api/mobile/progress/[id]", "POST /api/mobile/reservations/[id]/checkin", "POST /api/mobile/reservations/[id]/start", "POST /api/mobile/reservations/[id]/complete"].map((api, i) => (
                  <div key={i} style={{ fontSize: 15, color: TEXT_MUTED, fontFamily: "monospace", marginBottom: 8 }}>{api}</div>
                ))}
              </Card>
            </AnimItem>
            <AnimItem delay={52}>
              <Card>
                <div style={{ fontSize: 19, color: BLUE, fontFamily: "monospace", marginBottom: 12 }}>ステータス変更のトリガー</div>
                {[
                  ["ダッシュボード", "ステータスボタンをクリック"],
                  ["モバイルアプリ", "施工現場でタップ操作"],
                  ["API", "外部システムから PATCH"],
                ].map(([from, desc], i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{from}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED }}>{desc}</div>
                  </div>
                ))}
              </Card>
            </AnimItem>
          </div>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
