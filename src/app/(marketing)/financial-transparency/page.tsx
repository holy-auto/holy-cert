import type { ReactNode } from "react";
import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { CTABanner } from "@/components/marketing/CTABanner";
import { TransparencyMetrics, type TransparencyMetric } from "@/components/marketing/TransparencyMetrics";
import { TransparencyChart } from "@/components/marketing/TransparencyChart";
import { getMarketingStats } from "@/lib/marketing/stats";
import { SNAPSHOT_MONTH, CHURN, HONEST_LEDGER, ROADMAP, PLEDGES, type LedgerKind } from "@/lib/marketing/transparency";

export const metadata = {
  title: "透明性ダッシュボード ── 事業数値と財務の開示",
  description:
    "Ledra の事業の数字 ── 証明書発行数・導入施工店数・解約率・公開ロードマップ・障害情報・失敗事例 ── と、財務方針・資金使途・ランウェイを、同じ場所で率直に開示します。透明性を売る会社が、不透明であってはならない。",
  alternates: { canonical: "/financial-transparency" },
};

const ledgerStyle: Record<LedgerKind, { label: string; chip: string }> = {
  win: { label: "うまくいった", chip: "bg-emerald-500/[0.12] text-emerald-300 border-emerald-500/20" },
  miss: { label: "しくじった", chip: "bg-red-500/[0.12] text-red-300 border-red-500/20" },
  learn: { label: "学んだ", chip: "bg-amber-500/[0.12] text-amber-300 border-amber-500/20" },
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

export default async function FinancialTransparencyPage() {
  const stats = await getMarketingStats();

  const metrics: TransparencyMetric[] = [
    {
      label: "発行された施工証明書",
      value: stats.certificateCount,
      unit: "件",
      tone: "good",
      delta: `直近30日 +${stats.certificatesLast30Days.toLocaleString()}件`,
      note: "累計。改ざんできない形で記録されています。",
    },
    {
      label: "導入施工店",
      value: stats.shopCount,
      unit: "店",
      tone: "good",
      delta: `直近30日 +${stats.shopsLast30Days.toLocaleString()}店`,
      note: stats.isLive ? "本番DBから直接集計しています。" : "DBに到達できていません — フォールバック表示。",
    },
    stats.churn
      ? {
          label: "月次解約率",
          value: stats.churn.ratePct ?? 0,
          decimals: 1,
          unit: "%",
          tone: "warn",
          delta: `${stats.churn.monthLabel} 実績`,
          note: "前月完了分の実測（解約テナント数 ÷ 月初アクティブ数）。計測基盤の稼働以降のみ集計し、過去分は遡及していません。",
        }
      : {
          label: "月次解約率",
          tone: "warn",
          measuring: true,
          note: CHURN.note,
        },
  ];

  const hasIssuance = stats.issuanceByMonth.some((m) => m.value > 0);

  return (
    <>
      <PageHero
        badge="TRANSPARENCY"
        title="私たちは、自分の数字も隠しません。"
        subtitle="Ledra は「改ざんできない施工証明」を提供する会社です。だからこそ、事業の数字 ── 成長も失敗も ── と、お預かりする資金の流れを、同じ場所で包み隠さず公開します。透明性を売る会社が、不透明であってはならない。"
      />

      {/* 01. いまの数字 */}
      <Section id="metrics">
        <SectionHeading
          title="いまの数字"
          subtitle="毎月1日に更新します。良い月も、悪い月も、同じ場所に同じ大きさで載せます。"
        />
        <ScrollReveal variant="fade-up">
          <div className="mx-auto max-w-5xl">
            <TransparencyMetrics metrics={metrics} />
          </div>
        </ScrollReveal>
        <ScrollReveal variant="fade-in" delay={150}>
          <div className="mx-auto mt-6 max-w-5xl flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
            <div className="flex items-center gap-2">
              <span
                className={`block w-2 h-2 rounded-full ${
                  stats.isLive ? "bg-emerald-400 animate-[pulse-soft_2s_ease-in-out_infinite]" : "bg-white/40"
                }`}
              />
              <span className="text-xs font-medium text-white">
                証明書発行数・導入施工店数は
                {stats.isLive ? "本番DBから直接集計" : "現在DBに到達できずフォールバック表示"}
              </span>
            </div>
            <span className="hidden sm:inline-block w-px h-4 bg-white/10" />
            <span className="text-xs text-white leading-relaxed">
              {stats.churn
                ? `月次解約率は前月完了分（${stats.churn.monthLabel}）を実測しています。`
                : "月次解約率は計測基盤の稼働以降を集計します（実測値が出るまで取り繕った数値は出しません）。"}
            </span>
          </div>
        </ScrollReveal>
      </Section>

      {/* 02. 証明書発行数の推移 */}
      <Section bg="alt" id="growth">
        <SectionHeading
          title="証明書発行数の推移"
          subtitle="直近6ヶ月の月間発行数（本番DBから集計）。誇張のないグラフです。"
        />
        <ScrollReveal variant="fade-up">
          <div className="mx-auto max-w-4xl">
            {hasIssuance ? (
              <TransparencyChart data={stats.issuanceByMonth} />
            ) : (
              <p className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center text-sm text-white">
                {stats.isLive
                  ? "この6ヶ月の発行記録はまだありません。最初の1件がここに刻まれます。"
                  : "現在DBに到達できず、推移を表示できません。"}
              </p>
            )}
          </div>
        </ScrollReveal>
      </Section>

      {/* 03. 今月の正直な記録 */}
      <Section id="ledger">
        <SectionHeading
          title={HONEST_LEDGER.length > 0 ? `今月の正直な記録 ── ${SNAPSHOT_MONTH}` : "今月の正直な記録"}
          subtitle="うまくいったこと、しくじったこと、学んだこと。3つとも書きます。しくじりを省いた月は作りません。"
        />
        {HONEST_LEDGER.length > 0 ? (
          <div className="mx-auto max-w-3xl space-y-px rounded-2xl border border-white/[0.08] bg-white/[0.08] overflow-hidden">
            {HONEST_LEDGER.map((entry, i) => {
              const s = ledgerStyle[entry.kind];
              return (
                <ScrollReveal key={entry.title} variant="fade-up" delay={i * 60}>
                  <div className="grid grid-cols-1 sm:grid-cols-[112px_1fr] gap-3 sm:gap-6 bg-[#060a12] p-6">
                    <span
                      className={`justify-self-start inline-flex items-center rounded-md border px-2.5 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-wide ${s.chip}`}
                    >
                      {s.label}
                    </span>
                    <div>
                      <h3 className="text-[0.938rem] font-bold text-white leading-snug">{entry.title}</h3>
                      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-white">{entry.body}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        ) : (
          <p className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center text-sm leading-relaxed text-white">
            今月分はまだ公開していません。毎月1日に、うまくいった・しくじった・学んだを3つとも掲載します。
            <br />
            取り繕った記録は載せません ── 載せるときは、実際に起きたことだけを。
          </p>
        )}
      </Section>

      <Section bg="alt" className="!py-12 md:!py-16">
        <nav className="flex flex-wrap justify-center gap-2" aria-label="財務透明性の項目">
          {blocks.map((b) => (
            <a
              key={b.id}
              href={`#${b.id}`}
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-white hover:bg-white/[0.07] hover:text-white hover:border-white/[0.14] transition-colors"
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
                  <p className="mt-2 text-[0.938rem] leading-[1.85] text-white">{item.desc}</p>
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
                <p className="mt-1 text-xs text-white">{d.note}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-[0.688rem] font-medium ${
                  d.status === "available"
                    ? "bg-emerald-500/[0.12] text-emerald-300 border border-emerald-500/20"
                    : d.status === "in-progress"
                      ? "bg-amber-500/[0.12] text-amber-300 border border-amber-500/20"
                      : "bg-white/[0.06] text-white border border-white/[0.1]"
                }`}
              >
                {d.status === "available" ? "提供中" : d.status === "in-progress" ? "準備中" : "計画中"}
              </span>
            </div>
          ))}
          <p className="pt-4 text-xs text-white text-center leading-relaxed">
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

      {/* 公開ロードマップ */}
      <Section bg="alt" id="roadmap">
        <SectionHeading title="公開ロードマップ" subtitle="何を作っているか、何を後回しにしているかも隠しません。" />
        {ROADMAP.length > 0 ? (
          <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-5">
            {ROADMAP.map((col, ci) => (
              <ScrollReveal key={col.stage} variant="fade-up" delay={ci * 80}>
                <div>
                  <h3 className="font-mono text-[0.688rem] uppercase tracking-wider text-white border-b-2 border-white/80 pb-2.5 mb-3.5">
                    {col.heading}
                  </h3>
                  <ul className="space-y-2.5">
                    {col.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[0.875rem] text-white"
                      >
                        <span className="block font-mono text-[0.563rem] tracking-wider text-blue-300 mb-1">
                          {col.badge}
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        ) : (
          <p className="mx-auto max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-12 text-center text-sm leading-relaxed text-white">
            公開ロードマップは整備中です。確定し次第、進行中・次にやる・後回し中を、憶測なしで明示します。
          </p>
        )}
      </Section>

      {/* 透明性の約束 */}
      <Section id="pledge">
        <SectionHeading title="透明性の約束" subtitle="守れない約束はしません。守る約束だけを、ここに書きます。" />
        <div className="mx-auto max-w-3xl">
          <ul className="border-t border-white/[0.12]">
            {PLEDGES.map((pledge, i) => (
              <ScrollReveal key={pledge} variant="fade-up" delay={i * 60}>
                <li className="grid grid-cols-[40px_1fr] gap-4 items-start border-b border-white/[0.12] py-5">
                  <span className="font-bold text-[1.375rem] leading-none text-blue-300">{i + 1}</span>
                  <span className="text-[0.938rem] leading-relaxed text-white">{pledge}</span>
                </li>
              </ScrollReveal>
            ))}
          </ul>
          <p className="mt-8 text-center text-xs text-white leading-relaxed">
            このページ上部の数字と「正直な記録」は、毎月1日に更新します。
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
