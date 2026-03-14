import Link from "next/link";
import { requireDealerSession } from "@/lib/market/auth";
import { getPublishedNews } from "@/lib/market/news-db";
import { NEWS_CATEGORY_LABEL, fmtDate } from "@/lib/market/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "業界ニュース | HolyMarket" };

export default async function NewsPage() {
  await requireDealerSession();
  const articles = await getPublishedNews(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">業界ニュース</h1>
        <p className="text-sm text-gray-500 mt-1">フィルム・コーティング業界の最新情報</p>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">現在掲載中のニュースはありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/market/news/${a.public_id}`}
              className="group block bg-white border border-gray-200 rounded-2xl p-5 hover:border-gray-400 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="inline-flex rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold px-2.5 py-0.5">
                      {NEWS_CATEGORY_LABEL[a.category] ?? a.category}
                    </span>
                    <span className="text-xs text-gray-400">{fmtDate(a.published_at)}</span>
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {a.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {a.body.replace(/\n/g, " ")}
                  </p>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500 shrink-0 mt-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
