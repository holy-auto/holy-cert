import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { PricingCards } from "@/components/marketing/PricingCards";
import { PricingCard } from "@/components/marketing/PricingCard";
import { FeatureComparisonTable } from "@/components/marketing/FeatureComparisonTable";
import { FAQList } from "@/components/marketing/FAQList";
import { FAQItem } from "@/components/marketing/FAQItem";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import Link from "next/link";
import {
  PLANS,
  FEATURE_COMPARISON,
  ANNUAL_DISCOUNT_PERCENT,
  TEMPLATE_OPTIONS,
  TEMPLATE_ADDITIONAL_WORK,
  TEMPLATE_FAQ,
  ADD_ON_OPTIONS,
  NFC_TAG_PRICING,
  LAUNCH_CAMPAIGN,
} from "@/lib/marketing/pricing";

export const metadata = {
  title: "料金プラン",
  description: "CARTRUSTの料金プラン。無料プランから始められ、規模に合わせてスケールできます。",
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        badge="PRICING"
        title="シンプルで分かりやすい料金体系"
        subtitle="すべてのプランで基本機能をご利用いただけます。規模に合わせてお選びください。"
      />

      {/* キャンペーンバナー */}
      <Section>
        <ScrollReveal variant="fade-up" delay={0}>
          <div className="max-w-3xl mx-auto p-6 rounded-2xl bg-gradient-to-r from-blue-600/[0.12] to-violet-600/[0.12] border border-blue-500/20 mb-16">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-blue-300 bg-blue-500/15 border border-blue-500/20 mb-3">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-[pulse-soft_2s_ease-in-out_infinite]" />
                  期間限定
                </div>
                <h3 className="text-lg font-bold text-white">{LAUNCH_CAMPAIGN.description}</h3>
                <ul className="mt-2 space-y-1 text-sm text-white/60">
                  <li>NFC無料付与 {LAUNCH_CAMPAIGN.nfcFreeAllocation}枚（通常{NFC_TAG_PRICING.freeAllocation}枚）</li>
                  <li>請求書オプション 特別価格 {LAUNCH_CAMPAIGN.invoiceOptionPrice}/月</li>
                  <li>年間割引 {ANNUAL_DISCOUNT_PERCENT}%OFF（年間契約）</li>
                </ul>
              </div>
              <Link
                href="/contact/shops"
                className="inline-flex items-center justify-center font-medium rounded-lg text-sm px-6 py-3 bg-white text-[#060a12] hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                詳しく見る
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* メインプラン */}
        <PricingCards>
          <PricingCard
            name={PLANS.free.name}
            price={PLANS.free.price}
            unit={PLANS.free.unit}
            description={PLANS.free.description}
            delay={0}
            features={[...PLANS.free.features]}
            ctaLabel={PLANS.free.ctaLabel}
          />
          <PricingCard
            name={PLANS.starter.name}
            price={PLANS.starter.price}
            unit={PLANS.starter.unit}
            description={PLANS.starter.description}
            delay={100}
            features={[...PLANS.starter.features]}
          />
          <PricingCard
            name={PLANS.standard.name}
            price={PLANS.standard.price}
            unit={PLANS.standard.unit}
            description={PLANS.standard.description}
            delay={200}
            features={[...PLANS.standard.features]}
            recommended
          />
          <PricingCard
            name={PLANS.pro.name}
            price={PLANS.pro.price}
            unit={PLANS.pro.unit}
            description={PLANS.pro.description}
            delay={300}
            features={[...PLANS.pro.features]}
          />
        </PricingCards>

        {/* 年間契約・初期費用の補足 */}
        <ScrollReveal variant="fade-up" delay={200}>
          <div className="mt-12 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs text-white/40 mb-1">年間契約</div>
              <div className="text-lg font-bold text-blue-400">{ANNUAL_DISCOUNT_PERCENT}%OFF</div>
              <div className="text-xs text-white/40 mt-1">全有料プラン対象</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs text-white/40 mb-1">初期費用</div>
              <div className="text-sm font-medium text-white">
                Standard: {PLANS.standard.setupFee} / Pro: {PLANS.pro.setupFee}
              </div>
              <div className="text-xs text-white/40 mt-1">Free・Starterは初期費用なし</div>
            </div>
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs text-white/40 mb-1">NFC無料付与</div>
              <div className="text-lg font-bold text-white">{NFC_TAG_PRICING.freeAllocation}枚</div>
              <div className="text-xs text-white/40 mt-1">全プラン共通</div>
            </div>
          </div>
        </ScrollReveal>
      </Section>

      {/* 機能比較 */}
      <Section bg="alt">
        <SectionHeading
          title="プラン別機能比較"
          subtitle="各プランの詳細な機能一覧"
        />
        <ScrollReveal variant="fade-up" delay={100}>
          <FeatureComparisonTable rows={FEATURE_COMPARISON} />
        </ScrollReveal>
      </Section>

      {/* 追加オプション */}
      <Section>
        <SectionHeading
          title="追加オプション"
          subtitle="必要に応じてプランに追加できるオプションです"
        />
        <ScrollReveal variant="fade-up" delay={100}>
          <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(ADD_ON_OPTIONS).map((option) => (
              <div key={option.name} className="flex items-center justify-between p-5 rounded-xl bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.06] transition-colors">
                <div>
                  <div className="text-sm font-medium text-white">{option.name}</div>
                  {"packPrice" in option && (
                    <div className="text-xs text-white/35 mt-0.5">
                      パック: {option.packPrice}{option.packUnit}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-white">{option.price}</div>
                  <div className="text-xs text-white/40">{option.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </Section>

      {/* NFC タグ料金 */}
      <Section bg="alt">
        <SectionHeading
          title="NFCタグ追加購入"
          subtitle={`初回${NFC_TAG_PRICING.freeAllocation}枚は無料付与。追加分はパック購入が可能です`}
        />
        <ScrollReveal variant="fade-up" delay={100}>
          <div className="max-w-xl mx-auto grid grid-cols-3 gap-4">
            {NFC_TAG_PRICING.packs.map((pack) => (
              <div key={pack.quantity} className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <div className="text-2xl font-bold text-white">{pack.quantity}<span className="text-sm font-normal text-white/40">枚</span></div>
                <div className="mt-2 text-sm font-medium text-blue-400">{pack.price}</div>
                <div className="mt-1 text-xs text-white/35">@{Math.round(parseInt(pack.price.replace(/[¥,]/g, "")) / pack.quantity)}円/枚</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </Section>

      {/* 料金FAQ */}
      <Section>
        <SectionHeading title="料金に関するご質問" />
        <FAQList>
          <FAQItem
            question="無料プランから有料プランへの切り替えはいつでもできますか？"
            answer="はい、いつでもアップグレード可能です。無料プランでの発行データもそのまま引き継がれますので、安心してお切り替えいただけます。"
          />
          <FAQItem
            question="年間契約による割引はありますか？"
            answer={`はい、年間契約の場合は月額料金から${ANNUAL_DISCOUNT_PERCENT}%の割引が適用されます。詳しくはお問い合わせください。`}
          />
          <FAQItem
            question="月の発行数が上限を超えた場合はどうなりますか？"
            answer="上限に達した場合は追加発行ができなくなります。上位プランへのアップグレードをご検討いただくか、翌月までお待ちください。個別の追加発行オプションについてはお問い合わせください。"
          />
          <FAQItem
            question="解約手数料はかかりますか？"
            answer="解約手数料は一切かかりません。月額プランの場合、月末まではご利用いただけます。年間プランの場合は残期間分の返金はございませんのでご了承ください。"
          />
          <FAQItem
            question="保険会社のポータル利用は有料ですか？"
            answer="いいえ、保険会社のポータル利用は無料です。施工店がCARTRUSTを利用して発行した証明書の確認・検索・エクスポートを無料でご利用いただけます。"
          />
        </FAQList>
      </Section>

      {/* テンプレートオプション */}
      <Section bg="alt">
        <SectionHeading
          title="ブランド証明書オプション"
          subtitle="自社ロゴ・ブランドカラーを反映した施工証明書を発行できるオプションです。基本プランに追加してご利用いただけます。"
        />
        <PricingCards>
          <PricingCard
            name={TEMPLATE_OPTIONS.preset.name}
            price={TEMPLATE_OPTIONS.preset.price}
            unit={TEMPLATE_OPTIONS.preset.unit}
            description={`${TEMPLATE_OPTIONS.preset.description}（初期費用 ${TEMPLATE_OPTIONS.preset.setupFee}）`}
            delay={0}
            features={[...TEMPLATE_OPTIONS.preset.features]}
          />
          <PricingCard
            name={TEMPLATE_OPTIONS.custom.name}
            price={TEMPLATE_OPTIONS.custom.price}
            unit={TEMPLATE_OPTIONS.custom.unit}
            description={`${TEMPLATE_OPTIONS.custom.description}（初期費用 ${TEMPLATE_OPTIONS.custom.setupFee}）`}
            delay={100}
            features={[...TEMPLATE_OPTIONS.custom.features]}
            recommended
          />
        </PricingCards>
      </Section>

      {/* 追加作業費 */}
      <Section>
        <SectionHeading
          title="追加作業費"
          subtitle="テンプレート公開後の変更・追加は以下の料金にて承ります。"
        />
        <ScrollReveal variant="fade-up" delay={100}>
          <div className="overflow-x-auto">
            <table className="w-full max-w-2xl mx-auto text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="text-left py-4 px-4 font-medium text-white/40">作業内容</th>
                  <th className="text-right py-4 px-4 font-medium text-white">料金（税込）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {TEMPLATE_ADDITIONAL_WORK.map((row) => (
                  <tr key={row.item} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3.5 px-4 text-white">{row.item}</td>
                    <td className="py-3.5 px-4 text-right text-white/60">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollReveal>
      </Section>

      {/* テンプレートFAQ */}
      <Section bg="alt">
        <SectionHeading title="ブランド証明書に関するご質問" />
        <FAQList>
          {TEMPLATE_FAQ.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </FAQList>
      </Section>

      <CTABanner
        title="まずは無料で始めましょう"
        subtitle="クレジットカード不要。5分で始められます。"
        primaryLabel="無料で始める"
        primaryHref="/signup"
        secondaryLabel="資料請求"
        secondaryHref="/contact/shops"
      />
    </>
  );
}
