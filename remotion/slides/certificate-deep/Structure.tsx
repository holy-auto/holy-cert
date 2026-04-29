import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const CertStructure: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>証明書 深掘り — 1/5</Label>
        <Heading size={60}>証明書の構造<br /><span style={{ color: BLUE }}>何が記録されるのか</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          {[
            { category: "基本情報", color: BLUE, items: ["public_id（公開識別子）", "施工日・発行日", "施工店名・担当者", "ステータス（有効 / 無効）"] },
            { category: "車両情報", color: "#06b6d4", items: ["車両番号（ナンバー）", "車体型式 / 車台番号", "年式・色・メーカー", "走行距離"] },
            { category: "施工内容", color: "#8b5cf6", items: ["施工メニュー（品目）", "使用材料・製品名", "施工箇所・面積", "施工担当スタッフ"] },
            { category: "証拠データ", color: "#22c55e", items: ["ビフォーアフター写真", "C2PA 写真真正性記録", "Polygon ブロックチェーンハッシュ", "PDF 証明書バイナリ"] },
          ].map((sec, i) => (
            <AnimItem key={i} delay={i * 12}>
              <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${sec.color}30`, borderRadius: 16, padding: "22px 26px" }}>
                <div style={{ fontSize: 18, color: sec.color, fontFamily: "monospace", marginBottom: 12 }}>{sec.category}</div>
                {sec.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: sec.color, opacity: 0.7, flexShrink: 0 }} />
                    <span style={{ fontSize: 19, color: TEXT_MUTED }}>{item}</span>
                  </div>
                ))}
              </div>
            </AnimItem>
          ))}
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
