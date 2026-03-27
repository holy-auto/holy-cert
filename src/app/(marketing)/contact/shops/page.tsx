import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { DocumentRequestForm } from "@/components/marketing/DocumentRequestForm";
import Link from "next/link";
import { PLANS } from "@/lib/marketing/pricing";

export const metadata = {
  title: "加盟店向け資料請求",
  description: "CARTRUSTの加盟店（施工店）向け資料を無料でお届けします。料金プラン・機能一覧・導入事例をまとめた資料をご用意しています。",
};

const documentContents = [
  { label: "サービス概要・機能一覧", description: "証明書発行から顧客管理まで全機能をご紹介" },
  { label: "料金プラン詳細", description: "フリー〜プロまで全プランの費用と機能を比較" },
  { label: "導入ステップガイド", description: "アカウント作成から初回証明書発行までの流れ" },
  { label: "ブランド証明書オプション", description: "自社ロゴ入りカスタム証明書の作成方法と費用" },
];

export default function ShopDocumentPage() {
  return (
    <>
      <PageHero
        badge="FOR SHOPS"
        title="加盟店向け資料請求"
        subtitle="CARTRUSTの導入をご検討中の施工店様へ。サービス詳細・料金・機能比較をまとめた資料を無料でお届けします。"
      />

      <Section>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
          {/* Left: document contents + pricing summary */}
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

              {/* Quick pricing reference */}
              <div className="mt-10 p-5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <h3 className="text-sm font-medium text-white/60 mb-4">料金の目安</h3>
                <div className="space-y-3">
                  {Object.values(PLANS).map((plan) => (
                    <div key={plan.name} className="flex items-center justify-between">
                      <span className="text-sm text-white">{plan.name}</span>
                      <span className="text-sm font-medium text-white/70">{plan.price}<span className="text-xs text-white/40">{plan.unit}</span></span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  料金の詳細を見る
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: form */}
          <ScrollReveal variant="fade-left" delay={100} className="md:col-span-3">
            <DocumentRequestForm role="shop" />
          </ScrollReveal>
        </div>
      </Section>
    </>
  );
}
