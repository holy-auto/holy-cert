import { AbsoluteFill } from "remotion";
import { FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const CYAN = "#06b6d4";

export const InsurerTeamAndAnalytics: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 3 & 4</Label>
        <Heading size={56}>チーム管理 & 分析を活用<br /><span style={{ color: CYAN }}>組織全体で使う</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, color: CYAN, fontFamily: "monospace" }}>チーム管理 /insurer/users</div>
            {[
              { icon: "📧", title: "メンバー招待", desc: "メールアドレスで一括招待。CSV インポートも対応" },
              { icon: "🔑", title: "権限設定", desc: "閲覧のみ / 案件操作 / 管理者の3段階で制御" },
              { icon: "📋", title: "操作ログ", desc: "/insurer/audit — 誰がいつ何を操作したか完全記録" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: TEXT }}>{item.title}</div>
                    <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={32}>
            <Card>
              <div style={{ fontSize: 20, color: CYAN, fontFamily: "monospace", marginBottom: 16 }}>分析 /insurer/analytics</div>
              {[
                ["証明書照会数の推移", "月次トレンドを把握"],
                ["施工店別の案件数", "よく利用する店舗を確認"],
                ["案件クローズ率", "対応スピードの改善指標"],
                ["CSV / PDF エクスポート", "社内レポートに活用"],
              ].map(([title, desc], i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: TEXT }}>{title}</div>
                  <div style={{ fontSize: 16, color: TEXT_MUTED }}>{desc}</div>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
