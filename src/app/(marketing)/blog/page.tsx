import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Section } from "@/components/marketing/Section";
import { ScrollReveal } from "@/components/marketing/ScrollReveal";
import { CTABanner } from "@/components/marketing/CTABanner";
import { listContent } from "@/lib/marketing/content";

export const metadata = {
  title: "ブログ",
  description:
    "Ledra 編集部による、施工業界・証明書のあり方・技術解説に関する記事をお届けします。",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const entries = await listContent("blog");

  return (
    <>
      <PageHero
        badge="BLOG"
        title="記録と信頼をめぐる、読み物"
        subtitle="業界の現在地、Ledra の設計思想、技術の背景。編集部が継続的に書き溜めていく記事の一覧です。"
      />

      <Section>
        {entries.length === 0 ? (
          <div className="mx-auto max-w-xl text-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12">
            <p className="text-sm text-white/50 leading-relaxed">
              最初の記事を近日公開いたします。
              <br />
              しばらくお待ちください。
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
            {entries.map((e, i) => (
              <ScrollReveal key={e.frontmatter.slug} variant="fade-up" delay={i * 60}>
                <Link
                  href={`/blog/${e.frontmatter.slug}`}
                  className="group block h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 md:p-8 hover:bg-white/[0.06] hover:border-white/[0.14] hover:shadow-[0_0_28px_rgba(59,130,246,0.1)] hover:-translate-y-1 transition-all duration-400"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[0.688rem] text-white/40">
                    {e.frontmatter.publishedAt && (
                      <time dateTime={e.frontmatter.publishedAt}>
                        {formatDate(e.frontmatter.publishedAt)}
                      </time>
                    )}
                    {e.frontmatter.tags?.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full border border-white/[0.08] px-2 py-0.5 font-medium text-white/60"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <h2 className="mt-4 text-[1.125rem] md:text-[1.25rem] font-bold text-white group-hover:text-blue-200 transition-colors leading-[1.4]">
                    {e.frontmatter.title}
                  </h2>
                  {e.frontmatter.excerpt && (
                    <p className="mt-4 text-[0.938rem] leading-[1.75] text-white/55">
                      {e.frontmatter.excerpt}
                    </p>
                  )}
                  <p className="mt-6 inline-flex items-center gap-1 text-xs font-medium text-blue-300 group-hover:text-blue-200 transition-colors">
                    続きを読む →
                  </p>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        )}
      </Section>

      <CTABanner
        title="新着記事をメールでお届け"
        subtitle="フッターのメルマガにご登録いただくと、新しい記事の公開時にご案内いたします。"
        primaryLabel="資料ダウンロード"
        primaryHref="/resources"
        secondaryLabel="お問い合わせ"
        secondaryHref="/contact"
      />
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
