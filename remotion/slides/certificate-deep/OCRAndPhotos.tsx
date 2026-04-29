import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, TEXT, TEXT_MUTED, SlideLayout, Card } from "../../components/shared";

export const CertOCRAndPhotos: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>証明書 深掘り — 2/5</Label>
        <Heading size={60}>OCR & 写真の詳細<br /><span style={{ color: BLUE }}>入力の手間を限界まで削減</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 4 }}>車検証 OCR</div>
            {[
              { icon: "📷", title: "カメラで撮影するだけ", desc: "スマホ・タブレットのカメラで車検証を撮影" },
              { icon: "🤖", title: "自動抽出される項目", desc: "車両番号・型式・車台番号・年式・車両サイズ" },
              { icon: "✏️", title: "手動修正も可能", desc: "読み取り精度が低い場合は入力フォームで補正" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                    <div style={{ fontSize: 16, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={36}>
            <Card>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 16 }}>写真アップロード</div>
              {[
                ["複数枚同時アップロード", "ドラッグ＆ドロップに対応"],
                ["EXIF データを保持", "撮影日時・GPS が証拠として記録"],
                ["C2PA 真正性保証", "Adobe が策定する写真改ざん防止規格"],
                ["自動リサイズ", "high-res を保持しつつ配信最適化"],
                ["Supabase Storage 保存", "冗長化されたクラウドに永続保存"],
              ].map(([title, desc], i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 19, fontWeight: 600, color: "#fff" }}>{title}</div>
                  <div style={{ fontSize: 15, color: TEXT_MUTED }}>{desc}</div>
                </div>
              ))}
            </Card>
          </AnimItem>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
