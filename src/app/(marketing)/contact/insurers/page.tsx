import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { DocumentRequestForm } from "@/components/marketing/DocumentRequestForm";

export const metadata = {
  title: "保険会社向け資料請求",
  description: "CARTRUSTの保険会社向け機能・導入メリット・連携方法をまとめた資料を無料でお届けします。",
};

const documentContents = [
  { label: "保険会社ポータル機能一覧", description: "証明書検索・一括取得・ケース管理など全機能をご紹介" },
  { label: "データ連携・API仕様", description: "既存システムとの連携方法とAPI仕様の概要" },
  { label: "セキュリティ・コンプライアンス", description: "暗号化・アクセス制御・監査ログなどの対応状況" },
  { label: "導入フロー・サポート体制", description: "アカウント開設から運用開始までの流れとサポート内容" },
];

const highlights = [
  { value: "即時", label: "施工証明書の確認", description: "URLアクセスでリアルタイム確認" },
  { value: "改ざん防止", label: "データ信頼性", description: "デジタル署名による正確性担保" },
  { value: "無料", label: "保険会社のご利用", description: "ポータル利用に費用はかかりません" },
];

export default function InsurerDocumentPage() {
  return (
    <>
      <PageHero
        badge="FOR INSURERS"
        title="保険会社向け資料請求"
        subtitle="CARTRUSTの保険会社向けポータル機能と導入メリットをまとめた資料を無料でお届けします。"
      />

      <Section>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
          {/* Left: document contents + highlights */}
          <ScrollReveal variant="fade-right" delay={0} className="md:col-span-2">
            <div>
              <h2 className="text-xl font-bold text-white">資料の内容</h2>
              <div className="mt-6 space-y-4">
                {documentContents.map((item) => (
                  <div key={item.label} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-blue-500/[0.15] flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3 text-blue-400">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{item.label}</div>
                      <div className="text-xs text-white/40 mt-0.5">{item.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Key highlights */}
              <div className="mt-10 space-y-3">
                {highlights.map((item) => (
                  <div key={item.label} className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-white">{item.label}</div>
                        <div className="text-xs text-white/40 mt-0.5">{item.description}</div>
                      </div>
                      <span className="text-lg font-bold text-blue-400">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* Right: form */}
          <ScrollReveal variant="fade-left" delay={100} className="md:col-span-3">
            <DocumentRequestForm role="insurer" />
          </ScrollReveal>
        </div>
      </Section>
    </>
  );
}
