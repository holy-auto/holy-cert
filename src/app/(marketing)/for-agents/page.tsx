import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { CTABanner } from "@/components/marketing/CTABanner";

export const metadata = {
  title: "代理店の方へ",
  description: "CARTRUSTパートナープログラムで安定した収益を実現。紹介・コミッション管理を一元化し、効率的な代理店ビジネスを支援します。",
};

const commissionSteps = [
  { rate: "初期費用", value: "20%", description: "紹介先施工店の初期費用から" },
  { rate: "月額", value: "15%", description: "紹介先施工店の月額利用料から（継続報酬）" },
  { rate: "テンプレート", value: "10%", description: "ブランド証明書オプション売上から" },
];

export default function ForAgentsPage() {
  return (
    <>
      <PageHero
        badge="FOR AGENTS"
        title="パートナープログラムで、安定した収益を"
        subtitle="CARTRUSTの代理店として施工店をご紹介いただくことで、継続的なコミッション収入を得られます。"
      />

      {/* 主要メリット */}
      <Section>
        <SectionHeading
          title="代理店パートナーのメリット"
          subtitle="紹介するだけで継続報酬。営業ツールとサポート体制も充実しています"
        />
        <FeatureGrid>
          <FeatureCard
            delay={0}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="継続的なコミッション報酬"
            description="紹介先の施工店がCARTRUSTを利用し続ける限り、毎月のコミッションが発生。ストック型の安定収益を構築できます。"
          />
          <FeatureCard
            delay={100}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            title="専用ダッシュボードで一元管理"
            description="紹介状況・コミッション実績・ランキングをリアルタイムで確認。代理店ポータルから全てを管理できます。"
          />
          <FeatureCard
            delay={200}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            title="充実の営業支援ツール"
            description="営業資料・紹介リンク・キャンペーン情報を代理店ポータルから取得。効率的な営業活動をサポートします。"
          />
        </FeatureGrid>
      </Section>

      {/* コミッション体系 */}
      <Section bg="alt">
        <SectionHeading
          title="コミッション体系"
          subtitle="シンプルで分かりやすい報酬体系。紹介先が増えるほど安定した収益に"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {commissionSteps.map((item, i) => (
            <ScrollReveal key={item.rate} variant="scale-up" delay={i * 120}>
              <div className="text-center p-8 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <div className="text-xs font-medium text-white/40 uppercase tracking-wider">{item.rate}</div>
                <div className="mt-3 text-4xl md:text-5xl font-bold text-blue-400">{item.value}</div>
                <div className="mt-3 text-sm text-white/50">{item.description}</div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal variant="fade-up" delay={400}>
          <p className="mt-8 text-center text-sm text-white/35">
            ※ コミッション率は紹介実績に応じてランクアップする場合があります。詳細はお問い合わせください。
          </p>
        </ScrollReveal>
      </Section>

      {/* ワークフロー */}
      <Section>
        <SectionHeading
          title="かんたん3ステップで始められます"
          subtitle="パートナー登録から報酬獲得まで、シンプルなフロー"
        />
        <div className="max-w-3xl mx-auto">
          {[
            {
              step: "01",
              title: "パートナー登録",
              description: "お問い合わせフォームからお申し込みください。審査完了後、代理店ポータルのアカウントが発行されます。",
            },
            {
              step: "02",
              title: "施工店をご紹介",
              description: "代理店ポータルで発行される紹介リンクや営業資料を活用して、施工店にCARTRUSTをご紹介ください。",
            },
            {
              step: "03",
              title: "コミッションを獲得",
              description: "紹介先の施工店が契約すると、初期費用と月額料金からコミッションが継続的に発生します。",
            },
          ].map((item, i) => (
            <ScrollReveal key={item.step} variant="fade-up" delay={i * 120}>
              <div className="flex gap-6 md:gap-8 items-start py-8 border-b border-white/[0.06] last:border-b-0">
                <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-500/[0.1] flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-400">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-white/50 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </Section>

      {/* 代理店ポータル機能 */}
      <Section bg="alt">
        <SectionHeading
          title="代理店ポータルの主な機能"
          subtitle="ビジネスに必要なツールが揃っています"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          <FeatureCard
            variant="bordered"
            delay={0}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
            title="紹介リンク管理"
            description="専用の紹介リンクを発行。どのリンクから何件の登録があったかをリアルタイムで把握できます。"
          />
          <FeatureCard
            variant="bordered"
            delay={100}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            title="コミッションレポート"
            description="月別・紹介先別のコミッション明細を確認。請求書の発行も代理店ポータルから行えます。"
          />
          <FeatureCard
            variant="bordered"
            delay={200}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="営業資料・研修"
            description="最新の営業資料やプレゼン素材をダウンロード。研修コンテンツで製品知識も習得できます。"
          />
          <FeatureCard
            variant="bordered"
            delay={300}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
            title="ランキング・キャンペーン"
            description="代理店ランキングで自身の実績を確認。期間限定のキャンペーンでボーナスコミッションも獲得できます。"
          />
        </div>
      </Section>

      <CTABanner
        title="パートナーとして、一緒に成長しませんか"
        subtitle="代理店プログラムの詳細資料をお送りします。お気軽にお問い合わせください。"
        primaryLabel="資料請求"
        primaryHref="/contact/agents"
        secondaryLabel="お問い合わせ"
        secondaryHref="/contact"
      />
    </>
  );
}
