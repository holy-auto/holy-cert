import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

const NEXT = [
  { icon: "📊", title: "Square 売上連携", desc: "/admin/square — POS 決済データを自動同期" },
  { icon: "🗓️", title: "Google Calendar 連携", desc: "予約をカレンダーに自動反映" },
  { icon: "🏷️", title: "NFC タグの活用", desc: "車両に貼って、スキャンで施工履歴を即確認" },
  { icon: "📈", title: "経営分析を見る", desc: "/admin/management — 売上推移・リピート率・顧客単価" },
  { icon: "🤝", title: "BtoB を活用する", desc: "/admin/btob — 他店への発注・受注で仕事の幅を広げる" },
  { icon: "🆘", title: "サポートに問い合わせる", desc: "画面右下のチャットアイコンからいつでも相談できます" },
];

export const AdminNextSteps: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>次のステップ</Label>
        <Heading size={56}>基本をマスターしたら<br /><span style={{ color: BLUE }}>さらに活用しよう</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 44 }}>
          {NEXT.map((item, i) => (
            <AnimItem key={i} delay={i * 8}>
              <div style={{ display: "flex", gap: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "18px 22px" }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: TEXT }}>{item.title}</div>
                  <div style={{ fontSize: 17, color: TEXT_MUTED, marginTop: 4 }}>{item.desc}</div>
                </div>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
