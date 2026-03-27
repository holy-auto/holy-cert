import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { DocumentRequestForm } from "@/components/marketing/DocumentRequestForm";

export const metadata = {
  title: "代理店向け資料請求",
  description: "CARTRUSTパートナープログラムの詳細資料を無料でお届けします。コミッション体系・営業支援ツール・登録方法をご紹介。",
};

const documentContents = [
  { label: "パートナープログラム概要", description: "代理店としての活動内容とメリットをご紹介" },
  { label: "コミッション体系", description: "初期費用・月額・オプションごとの報酬率を詳細に解説" },
  { label: "営業支援ツール", description: "紹介リンク・営業資料・研修コンテンツのご案内" },
  { label: "登録・審査の流れ", description: "パートナー登録から報酬受取までのステップ" },
];

const highlights = [
  { value: "20%", label: "初期費用コミッション" },
  { value: "15%", label: "月額継続コミッション" },
  { value: "10%", label: "オプション売上コミッション" },
];

export default function AgentDocumentPage() {
  return (
    <>
      <PageHero
        badge="FOR AGENTS"
        title="代理店向け資料請求"
        subtitle="CARTRUSTパートナープログラムの詳細をまとめた資料を無料でお届けします。"
      />

      <Section>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-16">
          {/* Left: document contents + commission highlights */}
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

              {/* Commission highlights */}
              <div className="mt-10 p-5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <h3 className="text-sm font-medium text-white/60 mb-4">コミッション率</h3>
                <div className="space-y-3">
                  {highlights.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className="text-sm text-white/70">{item.label}</span>
                      <span className="text-lg font-bold text-blue-400">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: form */}
          <ScrollReveal variant="fade-left" delay={100} className="md:col-span-3">
            <DocumentRequestForm role="agent" />
          </ScrollReveal>
        </div>
      </Section>
    </>
  );
}
