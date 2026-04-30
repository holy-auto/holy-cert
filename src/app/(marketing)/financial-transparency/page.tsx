import type { ReactNode } from "react";
import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { CTABanner } from "@/components/marketing/CTABanner";

export const metadata = {
  title: "財務計画と資金使途の透明性",
  description:
    "Ledra の財務方針・資金使途・ランウェイを率直に開示します。お預かりするサブスクリプション収益と調達資金を、どのように『記録の信頼インフラ』へ投じるかをご説明します。",
  alternates: { canonical: "/financial-transparency" },
};

type Block = {
  id: string;
  title: string;
  lead: string;
  items: { title: string; desc: ReactNode }[];
};

const blocks: Block[] = [
  {
    id: "principles",
    title: "1. 財務運営の原則",
    lead: "サブスクリプション事業として、長期に持続可能な収支構造を最優先します。",
    items: [
      {
        title: "顧客資金と運営資金の分離",
        desc: "Stripe を通じてお預かりする決済・サブスクリプション収益は、専用の事業口座で管理。代理店コミッション・税金等の引当を区分して計上します。",
      },
      {
        title: "保守的なキャッシュ管理",
        desc: "事業運転資金は最低 12 ヶ月分のランウェイを確保することを内部基準としています。短期投機的な運用は行いません。",
      },
      {
        title: "外部監査と会計基準",
        desc: "日本の会社法・法人税法に準拠した会計処理を行い、税理士による月次レビューを実施。一定規模到達時に独立監査法人によるレビューへ移行します。",
      },
    ],
  },
  {
    id: "use-of-funds",
    title: "2. 資金使途の内訳",
    lead: "ご契約料金と調達資金が、どこへ投じられているかを目安比率で開示します。",
    items: [
      {
        title: "プロダクト開発（およそ 50%）",
        desc: "証明書発行・電子署名・Polygon アンカリング・モバイルアプリ等のエンジニアリングと、信頼性に直結するインフラ（Supabase, Vercel, Sentry, Upstash 等）への投資。",
      },
      {
        title: "セキュリティと運用（およそ 15%）",
        desc: "監査ログ基盤、脆弱性対応、ISMS / プライバシーマーク取得準備、24/7 監視、バックアップ・DR 訓練、外部ペネトレーションテスト。",
      },
      {
        title: "顧客サポートと導入支援（およそ 15%）",
        desc: "施工店・代理店・保険会社のオンボーディング、トレーニング、問合せ対応、現地導入支援。",
      },
      {
        title: "営業・マーケティング（およそ 15%）",
        desc: "業界イベント・カンファレンス出展、コンテンツ制作、代理店ネットワーク構築、PoC 推進。",
      },
      {
        title: "コーポレート・管理（およそ 5%）",
        desc: "法務・会計・税務、ガバナンス整備、コンプライアンス対応。",
      },
    ],
  },
  {
    id: "pricing-philosophy",
    title: "3. 料金設計の考え方",
    lead: "値付けの背景と、値上げ・値下げのルールを明文化します。",
    items: [
      {
        title: "原価連動の透明性",
        desc: "ストレージ・ブロックチェーン手数料・PDF レンダリング・通信費など、変動原価を月次で把握。プラン料金の改定時には根拠を事前にお知らせします。",
      },
      {
        title: "事前通知と猶予期間",
        desc: "プラン料金を改定する場合は、契約者の皆さまに最低 60 日前までに通知し、移行猶予期間を設けます。既存契約の中途改定は原則として行いません。",
      },
      {
        title: "代理店コミッションの明示",
        desc: "代理店経由のご契約に対する成果報酬は契約書に明記。お客様の支払額に上乗せされることはありません。",
      },
    ],
  },
  {
    id: "runway-disclosure",
    title: "4. ランウェイ・調達状況の開示",
    lead: "経営の継続性に関わる情報を、契約者向けに定期開示します。",
    items: [
      {
        title: "四半期ごとの財務サマリ",
        desc: "売上規模レンジ・MRR 成長率・ランウェイ月数・主要なコスト変動を、契約者向けポータルにて四半期ごとに開示します。",
      },
      {
        title: "重大事象の即時通知",
        desc: "資金調達・株主構成の重大変更・主要インフラ提供者の変更等、サービス継続性に影響しうる事象は速やかにご通知します。",
      },
      {
        title: "事業継続計画（BCP）",
        desc: "万一の事業停止時にも、お客様データのエクスポート手段と、証明書検証用 Polygon アンカーへの恒久的アクセスを保証します。",
      },
    ],
  },
  {
    id: "data-as-asset",
    title: "5. お客様データの『非資産化』",
    lead: "お客様の記録は、私たちのバランスシート上の資産ではありません。",
    items: [
      {
        title: "データ売却を行いません",
        desc: "施工記録・顧客情報・写真等を、第三者へ販売・譲渡することはありません。M&A 等の場合も契約条件の継承を前提とします。",
      },
      {
        title: "解約時の完全エクスポート",
        desc: "解約時には、PDF 証明書一式・CSV データ・写真原本を一括エクスポート可能。Polygon 上のアンカーは恒久的に検証可能な状態を維持します。",
      },
      {
        title: "保管コストの自己負担",
        desc: "長期保管に伴うストレージ・アンカリング手数料は、Ledra が負担し、お客様の月額に転嫁しません（標準プラン範囲内）。",
      },
    ],
  },
];

type DisclosureItem = {
  label: string;
  status: "planned" | "in-progress" | "available";
  note: string;
};

const disclosures: DisclosureItem[] = [
  {
    label: "四半期 財務サマリ（契約者ポータル）",
    status: "in-progress",
    note: "次回開示予定: 2026 年 Q2。MRR レンジ・ランウェイ月数・主要コスト変動。",
  },
  {
    label: "年次 資金使途レポート",
    status: "planned",
    note: "初回発行予定: 2027 年 1 月。前年度の調達・支出内訳を開示。",
  },
  {
    label: "事業継続計画（BCP）ホワイトペーパー",
    status: "available",
    note: "ご請求にて提供。データエクスポート手順・Polygon 検証方法を含みます。",
  },
];

export default function FinancialTransparencyPage() {
  return (
    <>
      <PageHero
        badge="FINANCIAL TRANSPARENCY"
        title="お預かりする資金の流れを、率直に開示します。"
        subtitle="サブスクリプション収益と調達資金が、どのように『記録の信頼インフラ』へ投じられているか。 Ledra の財務運営の考え方をご紹介します。"
      />

      <Section bg="alt" className="!py-12 md:!py-16">
        <nav className="flex flex-wrap justify-center gap-2" aria-label="財務透明性の項目">
          {blocks.map((b) => (
            <a
              key={b.id}
              href={`#${b.id}`}
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.07] hover:text-white hover:border-white/[0.14] transition-colors"
            >
              {b.title}
            </a>
          ))}
        </nav>
      </Section>

      {blocks.map((b, idx) => (
        <Section key={b.id} id={b.id} bg={idx % 2 === 0 ? "white" : "alt"}>
          <SectionHeading title={b.title} subtitle={b.lead} />
          <div className="mx-auto max-w-3xl space-y-5">
            {b.items.map((item, i) => (
              <ScrollReveal key={item.title} variant="fade-up" delay={i * 50}>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 md:p-7">
                  <h3 className="text-[1.063rem] font-bold text-white leading-snug">{item.title}</h3>
                  <p className="mt-2 text-[0.938rem] leading-[1.85] text-white/80">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </Section>
      ))}

      <Section>
        <SectionHeading title="開示物の状況" subtitle="財務透明性に関する開示資料の発行状況を、率直にお伝えします。" />
        <div className="mx-auto max-w-2xl space-y-4">
          {disclosures.map((d) => (
            <div
              key={d.label}
              className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div>
                <p className="text-sm font-bold text-white">{d.label}</p>
                <p className="mt-1 text-xs text-white/80">{d.note}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[0.688rem] font-medium ${
                  d.status === "available"
                    ? "bg-emerald-500/[0.12] text-emerald-300 border border-emerald-500/20"
                    : d.status === "in-progress"
                      ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/20"
                      : "bg-white/[0.06] text-white/80 border border-white/[0.1]"
                }`}
              >
                {d.status === "available" ? "提供中" : d.status === "in-progress" ? "準備中" : "計画中"}
              </span>
            </div>
          ))}
          <p className="pt-4 text-xs text-white/75 text-center leading-relaxed">
            開示の進捗は、本ページにて随時更新してまいります。
            <br />
            個別のご質問は{" "}
            <a href="mailto:ir@ledra.co.jp" className="text-blue-400 hover:underline">
              ir@ledra.co.jp
            </a>{" "}
            までお寄せください。
          </p>
        </div>
      </Section>

      <CTABanner
        title="財務方針の詳細を、資料でお届けします"
        subtitle="資金使途の内訳・料金改定ポリシー・事業継続計画を記したホワイトペーパーをお送りします。"
        primaryLabel="ホワイトペーパーをダウンロード"
        primaryHref="/resources"
        secondaryLabel="お問い合わせ"
        secondaryHref="/contact"
      />
    </>
  );
}
