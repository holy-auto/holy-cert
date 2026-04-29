import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const WorkflowOverview: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ワークフロー 深掘り — 1/5</Label>
        <Heading size={60}>案件ワークフローとは<br /><span style={{ color: BLUE }}>なぜ1画面に統合したか</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 48 }}>
          <AnimItem delay={0}>
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 16, padding: "28px" }}>
              <div style={{ fontSize: 18, color: "#f87171", fontFamily: "monospace", marginBottom: 16 }}>Before（従来）</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["/reservations", "→", "/certificates/new", "→", "/invoices/new", "→", "/pos"].map((item, i) => (
                  <div key={i} style={{ fontSize: item === "→" ? 20 : 22, color: item === "→" ? "rgba(255,255,255,0.2)" : "#f87171", fontFamily: "monospace", paddingLeft: item === "→" ? 20 : 0 }}>{item}</div>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 17, color: "rgba(255,255,255,0.4)" }}>複数画面を往復 → 都度情報を再入力</div>
            </div>
          </AnimItem>
          <AnimItem delay={16}>
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 16, padding: "28px" }}>
              <div style={{ fontSize: 18, color: "#86efac", fontFamily: "monospace", marginBottom: 16 }}>After（Ledra）</div>
              <div style={{ fontSize: 24, color: "#86efac", fontFamily: "monospace", marginBottom: 12 }}>/admin/jobs/[id]</div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
                {["ステータスステッパー", "顧客・車両タブ", "証明書タブ", "請求タブ", "次アクション自動引継ぎ"].map((f, i) => (
                  <span key={i} style={{ fontSize: 17, padding: "6px 14px", borderRadius: 8, background: "rgba(34,197,94,0.15)", color: "#86efac" }}>{f}</span>
                ))}
              </div>
              <div style={{ marginTop: 16, fontSize: 17, color: "rgba(255,255,255,0.4)" }}>1画面で完結 → 再入力ゼロ</div>
            </div>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
