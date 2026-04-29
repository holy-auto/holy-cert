import { AbsoluteFill } from "remotion";
import { FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const VIOLET = "#8b5cf6";

export const AgentReferralLink: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 1 & 2</Label>
        <Heading size={60}>申請 → 紹介リンクを作る<br /><span style={{ color: VIOLET }}>承認されたらすぐ活動開始</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AnimItem delay={0}>
              <div style={{ background: `${VIOLET}12`, border: `1px solid ${VIOLET}30`, borderRadius: 16, padding: "24px 28px" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 12 }}>パートナー申請</div>
                {["/agent/apply にアクセス", "基本情報・活動エリアを入力", "運営審査（通常1〜2営業日）", "承認メールが届いたら活動開始"].map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${VIOLET}30`, border: `1px solid ${VIOLET}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: VIOLET, flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 19, color: TEXT_MUTED }}>{step}</span>
                  </div>
                ))}
              </div>
            </AnimItem>
          </div>
          <AnimItem delay={20}>
            <Card>
              <div style={{ fontSize: 20, color: VIOLET, fontFamily: "monospace", marginBottom: 16 }}>紹介リンクの作り方</div>
              <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6, marginBottom: 16 }}>
                /agent/referral-links から「新規リンクを作成」
              </div>
              {[
                { icon: "🔗", text: "リンクごとにトラッキング" },
                { icon: "📊", text: "クリック数・登録数を計測" },
                { icon: "🎯", text: "キャンペーン別に複数作成" },
                { icon: "📱", text: "SNS・名刺・チラシに活用" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <span style={{ fontSize: 20, color: TEXT_MUTED }}>{item.text}</span>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
