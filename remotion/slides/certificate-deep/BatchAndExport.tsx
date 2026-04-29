import { AbsoluteFill } from "remotion";
import { BLUE, FONT, Label, Heading, AnimItem, Card, TEXT, TEXT_MUTED, SlideLayout } from "../../components/shared";

export const CertBatchAndExport: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#060a12", fontFamily: FONT }}>
      <SlideLayout>
        <Label>証明書 深掘り — 5/5</Label>
        <Heading size={60}>バッチ処理 & 出力<br /><span style={{ color: BLUE }}>大量発行も効率的に</span></Heading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 44 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 4 }}>バッチ PDF 出力</div>
            {[
              { icon: "☑️", title: "複数証明書を一括選択", desc: "一覧画面でチェックを入れて「PDF 一括生成」をクリック" },
              { icon: "⚙️", title: "非同期生成 (QStash)", desc: "重い処理はバックグラウンドで実行。画面をそのまま使い続けられる" },
              { icon: "📦", title: "ZIP でダウンロード", desc: "生成完了後にまとめて ZIP ファイルとしてダウンロード" },
            ].map((item, i) => (
              <AnimItem key={i} delay={i * 10}>
                <div style={{ display: "flex", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px 20px" }}>
                  <span style={{ fontSize: 24 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{item.title}</div>
                    <div style={{ fontSize: 15, color: TEXT_MUTED, marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              </AnimItem>
            ))}
          </div>
          <AnimItem delay={36}>
            <Card>
              <div style={{ fontSize: 20, color: BLUE, fontFamily: "monospace", marginBottom: 16 }}>その他の証明書操作</div>
              {[
                ["📋", "証明書複製", "既存証明書をコピーして新規発行。同一車両の再施工に便利"],
                ["🚫", "無効化", "発行後でも任意のタイミングで無効化。QR ページに即反映"],
                ["🔄", "有効化", "一度無効にした証明書を再度有効に戻すことも可能"],
                ["🔗", "共有リンク", "特定の証明書を直接指定した共有 URL を発行"],
              ].map(([icon, title, desc], i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{title}</div>
                    <div style={{ fontSize: 14, color: TEXT_MUTED }}>{desc}</div>
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
