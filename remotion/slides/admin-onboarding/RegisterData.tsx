import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const AdminRegisterData: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>ステップ 2</Label>
        <Heading size={60}>顧客・車両を登録する<br /><span style={{ color: BLUE }}>3つの方法</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 48 }}>
          {[
            { icon: "✋", method: "手動入力", path: "/admin/vehicles/new", points: ["車両番号・型式・年式を入力", "顧客情報と紐付け", "NFC タグも同時登録可能"] },
            { icon: "📷", method: "車検証 OCR", path: "カメラアイコン", points: ["カメラで車検証を撮影", "型式・車両番号を自動抽出", "数秒で登録完了"] },
            { icon: "📊", method: "CSV 一括インポート", path: "/admin/vehicles + インポート", points: ["既存データをCSVで一括取り込み", "ヘッダー行でカラムをマッピング", "数百台を一度に登録"] },
          ].map((item, i) => (
            <AnimItem key={i} delay={i * 14}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32, height: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 40 }}>{item.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: TEXT }}>{item.method}</div>
                <div style={{ fontSize: 16, fontFamily: "monospace", color: BLUE, background: `${BLUE}15`, padding: "6px 12px", borderRadius: 8 }}>{item.path}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {item.points.map((pt, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span style={{ color: BLUE, fontSize: 16, marginTop: 2 }}>▸</span>
                      <span style={{ fontSize: 20, color: TEXT_MUTED, lineHeight: 1.4 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
