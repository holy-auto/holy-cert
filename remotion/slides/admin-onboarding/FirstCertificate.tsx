import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const FLOW = [
  { step: "01", icon: "🏃", title: "案件を開始", desc: "ダッシュボードの「飛び込み案件」または予約から案件を作成" },
  { step: "02", icon: "🚗", title: "車両・顧客を紐付け", desc: "/admin/jobs/[id] で車両と顧客を検索して紐付け" },
  { step: "03", icon: "📸", title: "施工内容・写真を入力", desc: "施工メニューを選択し、ビフォーアフター写真をアップロード" },
  { step: "04", icon: "🪪", title: "証明書を発行", desc: "「証明書を発行」ボタン1つで QR コード付き証明書が完成" },
  { step: "05", icon: "📱", title: "顧客に共有", desc: "QR コードや URL を LINE・メールで送信するだけ" },
];

export const AdminFirstCertificate: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 3</Label>
        <Heading size={60}>はじめての証明書発行<br /><span style={{ color: BLUE }}>5ステップで完了</span></Heading>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 44 }}>
          {FLOW.map((item, i) => (
            <AnimItem key={i} delay={i * 10}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 24px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: `${BLUE}20`, border: `1.5px solid ${BLUE}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontFamily: "monospace", color: BLUE, flexShrink: 0 }}>{item.step}</div>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: TEXT }}>{item.title}</div>
                  <div style={{ fontSize: 18, color: TEXT_MUTED, marginTop: 2 }}>{item.desc}</div>
                </div>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
