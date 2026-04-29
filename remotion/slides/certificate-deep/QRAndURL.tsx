import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const CertQRAndURL: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>証明書 深掘り — 3/5</Label>
        <Heading size={60}>QR コードと公開 URL<br /><span style={{ color: BLUE }}>誰でも・いつでも検証できる</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <AnimItem delay={0}>
            <Card>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 16 }}>URL の構造</div>
              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "16px 20px", fontFamily: "monospace", fontSize: 22, color: "#86efac", marginBottom: 16 }}>
                ledra.jp/c/<span style={{ color: "#fbbf24" }}>LC-20260401-XXXX</span>
              </div>
              <div style={{ fontSize: 18, color: TEXT_MUTED, lineHeight: 1.6 }}>
                public_id は世界でユニーク。
                ログイン不要で誰でもアクセス可能。
                保険会社・中古車販売店・顧客が即確認。
              </div>
            </Card>
          </AnimItem>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔍", title: "真正性検証バッジ", desc: "ブロックチェーンのハッシュと一致していれば「検証済み」バッジを表示" },
              { icon: "📄", title: "PDF ダウンロード", desc: "顧客・保険会社・中古車販売店がワンクリックで PDF を取得" },
              { icon: "🖼️", title: "OGP 画像自動生成", desc: "SNS シェア時にサムネイルが自動生成。施工店のブランディングに活用" },
              { icon: "🔒", title: "無効化対応", desc: "証明書を無効化すると公開ページに「無効」バナーが表示される" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10 + 12}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px" }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
        </div>
      </SlideLayout>
    </AbsoluteFill>
  );
};
