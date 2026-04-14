import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import VerifyClient from "./VerifyClient";

export const metadata = {
  title: "証明書を検証する",
  description:
    "Ledra で発行された施工証明書の写真が改ざんされていないかを、ブラウザ上で独立検証できます。ファイルはアップロードされず、SHA-256 ハッシュのみがサーバーに送信されます。",
};

// 公開ページだが、ブロックチェーンへの読み取りクエリを含むため ISR は適用しない
export const revalidate = 0;

export default function VerifyPage() {
  return (
    <>
      {/* Hero */}
      <Section bg="white">
        <SectionHeading
          title="証明書の写真を独立検証"
          subtitle="画像をブラウザで選択するだけで、その写真が Ledra で発行された証明書と一致するか、そしてブロックチェーンに記録された改ざん防止ハッシュと合致するかを確認できます。画像そのものはアップロードされません。"
        />
        <div className="mx-auto mt-10 max-w-2xl">
          <VerifyClient />
        </div>
      </Section>

      {/* How it works */}
      <Section bg="alt">
        <SectionHeading title="仕組み" />
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {[
            {
              step: "1",
              title: "ブラウザ内でハッシュを計算",
              desc: "選択した画像の SHA-256 ハッシュをブラウザが直接計算します。画像ファイル本体はサーバーに送られません。",
            },
            {
              step: "2",
              title: "ハッシュだけを Ledra に送信",
              desc: "64 桁の16進文字列だけを検証 API に POST し、発行時のメタデータを照合します。",
            },
            {
              step: "3",
              title: "Polygon で改ざん有無を確認",
              desc: "LedraAnchor スマートコントラクトの読み取り専用呼び出しで、ハッシュがオンチェーンに記録されているかを検証 (ガス代不要)。",
            },
            {
              step: "4",
              title: "公開 OK なメタ情報のみ表示",
              desc: "店舗名・証明書 ID・撮影日時・真正性ランクなど、公開可能な情報のみを返却。顧客氏名や連絡先は一切含まれません。",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card flex items-start gap-4 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-primary">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
