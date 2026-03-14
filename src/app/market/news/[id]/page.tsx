import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDealerSession } from "@/lib/market/auth";
import { getNewsById } from "@/lib/market/news-db";
import { NEWS_CATEGORY_LABEL, fmtDate } from "@/lib/market/constants";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireDealerSession();
  const { id } = await params;
  const article = await getNewsById(id);
  if (!article) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/market/news" className="text-sm text-blue-600 hover:underline">
          ← ニュース一覧
        </Link>
      </div>

      <article className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-0.5">
            {NEWS_CATEGORY_LABEL[article.category] ?? article.category}
          </span>
          <span className="text-sm text-gray-400">{fmtDate(article.published_at)}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>

        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
          {article.body}
        </div>

        {article.source_url && (
          <div className="pt-4 border-t border-gray-100">
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              出典: {article.source_url}
            </a>
          </div>
        )}
      </article>
    </div>
  );
}
