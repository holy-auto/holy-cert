import { AbsoluteFill } from "remotion";
import { FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const VIOLET = "#8b5cf6";

export const AgentCommissionAndGrowth: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 4</Label>
        <Heading size={56}>コミッションを増やす<br /><span style={{ color: VIOLET }}>ランクアップで報酬アップ</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "📊", title: "ダッシュボードで確認", desc: "紹介総数・成約率・今月のコミッションを一目で把握" },
              { icon: "🏆", title: "ランキングで競争", desc: "/agent/rankings — トップエージェントの実績と自分を比較" },
              { icon: "🎓", title: "研修で成約率アップ", desc: "/agent/training — 施工店オーナーへの訴求方法・FAQ" },
              { icon: "📣", title: "キャンペーンを活用", desc: "/agent/campaigns — 期間限定ボーナスで効率的に稼ぐ" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px" }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>{item.title}</div>
                    <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={40}>
            <Card>
              <div style={{ fontSize: 20, color: VIOLET, fontFamily: "monospace", marginBottom: 16 }}>サポートリソース</div>
              {[
                ["📁", "営業資料", "/agent/materials でダウンロード"],
                ["❓", "FAQ", "よくある質問・断られた時の切り返し"],
                ["🎫", "サポートチケット", "/agent/support からいつでも相談"],
                ["📜", "契約書確認", "/agent/contracts で契約内容を確認"],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: TEXT }}>{title}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED }}>{desc}</div>
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
