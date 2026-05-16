import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { CTABanner } from "@/components/marketing/CTABanner";
import { TransparencyMetrics, type TransparencyMetric } from "@/components/marketing/TransparencyMetrics";
import { TransparencyChart } from "@/components/marketing/TransparencyChart";
import { getMarketingStats } from "@/lib/marketing/stats";
import {
  SNAPSHOT_MONTH,
  TRANSPARENCY_FIGURES_ARE_SAMPLE,
  CHURN,
  ISSUANCE_HISTORY,
  HONEST_LEDGER,
  ROADMAP,
  PLEDGES,
  type LedgerKind,
} from "@/lib/marketing/transparency";

export const metadata: Metadata = {
  title: "透明性ダッシュボード",
  description:
    "Ledra の事業の数字 ── 証明書発行数・導入施工店数・解約率・公開ロードマップ・障害情報・失敗事例まで率直に開示します。透明性を売る会社が、不透明であってはならない。",
  alternates: { canonical: "/transparency" },
};

const ledgerStyle: Record<LedgerKind, { label: string; chip: string }> = {
  win: { label: "うまくいった", chip: "bg-emerald-500/[0.12] text-emerald-300 border-emerald-500/20" },
  miss: { label: "しくじった", chip: "bg-red-500/[0.12] text-red-300 border-red-500/20" },
  learn: { label: "学んだ", chip: "bg-amber-500/[0.12] text-amber-300 border-amber-500/20" },
};

export default async function TransparencyPage() {
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
    {
      label: "月次解約率",
      value: CHURN.rate,
      decimals: 1,
      unit: "%",
      tone: "warn",
      delta: `目標(${CHURN.target}%)未達`,
      note: CHURN.note,
    },
  ];

  return (
    <>
      <PageHero
        badge="TRANSPARENCY DASHBOARD"
        title="私たちは、自分の数字も隠しません。"
        subtitle="Ledra は「改ざんできない施工証明」を提供する会社です。だからこそ、自分たちの事業の数字 ── 成長も、失敗も ── 包み隠さず公開します。透明性を売る会社が、不透明であってはならない。"
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
              解約率と推移グラフは現時点ではサンプル値です（実運用で実績へ差し替え）。
            </span>
          </div>
        </ScrollReveal>
      </Section>

      {/* 02. 証明書発行数の推移 */}
      <Section bg="alt" id="growth">
        <SectionHeading
          title="証明書発行数の推移"
          subtitle={`直近6ヶ月の月間発行数。誇張のないグラフです。${
            TRANSPARENCY_FIGURES_ARE_SAMPLE ? "（数値はサンプル）" : ""
          }`}
        />
        <ScrollReveal variant="fade-up">
          <div className="mx-auto max-w-4xl">
            <TransparencyChart data={ISSUANCE_HISTORY} />
          </div>
        </ScrollReveal>
      </Section>

      {/* 03. 今月の正直な記録 */}
      <Section id="ledger">
        <SectionHeading
          title={`今月の正直な記録 ── ${SNAPSHOT_MONTH}`}
          subtitle="うまくいったこと、しくじったこと、学んだこと。3つとも書きます。しくじりを省いた月は作りません。"
        />
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
      </Section>

      {/* 04. 公開ロードマップ */}
      <Section bg="alt" id="roadmap">
        <SectionHeading title="公開ロードマップ" subtitle="何を作っているか、何を後回しにしているかも隠しません。" />
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
      </Section>

      {/* 05. 透明性の約束 */}
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
            このページは毎月1日に更新します。ご質問・ご指摘は{" "}
            <a href="mailto:ir@ledra.co.jp" className="text-blue-400 hover:underline">
              ir@ledra.co.jp
            </a>{" "}
            までお寄せください。
          </p>
        </div>
      </Section>

      <CTABanner
        title="記録の信頼を、私たち自身にも適用しています"
        subtitle="改ざんできない施工証明と同じ姿勢で、事業の数字も率直に開示します。導入のご相談はお気軽に。"
        primaryLabel="プランを見る"
        primaryHref="/pricing"
        secondaryLabel="財務透明性ポリシー"
        secondaryHref="/financial-transparency"
        trackLocation="transparency-cta"
      />
    </>
  );
}
