import Link from "next/link";
import { requireDealerSession } from "@/lib/market/auth";
import { getOpenJobs } from "@/lib/market/jobs-db";
import {
  SERVICE_CATEGORIES, CATEGORY_LABEL, PREFECTURES, fmtPrice, fmtDate,
} from "@/lib/market/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "受発注 | HolyMarket" };

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; prefecture?: string }>;
}) {
  const { dealer } = await requireDealerSession();
  const { category, prefecture } = await searchParams;

  const jobs = await getOpenJobs({ category, prefecture });
  const myJobs = jobs.filter((j) => j.poster_dealer_id === dealer.id);
  const otherJobs = jobs.filter((j) => j.poster_dealer_id !== dealer.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">仕事の受発注</h1>
          <p className="text-sm text-gray-500 mt-1">施行店間でサブ・外注の仕事を発注・受注できます</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/market/jobs/my"
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            自分の案件
          </Link>
          <Link
            href="/market/jobs/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            案件を投稿
          </Link>
        </div>
      </div>

      {/* フィルタ */}
      <form method="get" className="flex flex-wrap gap-3 bg-gray-50 rounded-xl p-4">
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">全カテゴリ</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          name="prefecture"
          defaultValue={prefecture ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">全都道府県</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          絞り込む
        </button>
        {(category || prefecture) && (
          <Link href="/market/jobs" className="text-sm text-gray-500 hover:text-gray-700 self-center">クリア</Link>
        )}
      </form>

      {/* 案件一覧 */}
      {otherJobs.length === 0 && myJobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">現在募集中の案件はありません</p>
          <p className="text-sm mt-2">仕事を依頼する場合は「案件を投稿」から登録してください</p>
        </div>
      ) : (
        <div className="space-y-3">
          {otherJobs.map((job) => (
            <Link
              key={job.id}
              href={`/market/jobs/${job.public_id}`}
              className="group block bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5">
                      {CATEGORY_LABEL[job.service_category] ?? job.service_category}
                    </span>
                    <span className="text-xs text-gray-500">{job.prefecture}{job.city ? ` ${job.city}` : ""}</span>
                    {job.deadline && (
                      <span className="text-xs text-orange-500">〆切: {fmtDate(job.deadline)}</span>
                    )}
                  </div>
                  <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {job.title}
                  </h2>
                  <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <span>{job.poster?.company_name}</span>
                    {(job.budget_min || job.budget_max) && (
                      <span className="font-medium text-gray-600">
                        予算: {fmtPrice(job.budget_min)} 〜 {fmtPrice(job.budget_max)}
                      </span>
                    )}
                    {job.desired_date && (
                      <span>希望日: {fmtDate(job.desired_date)}</span>
                    )}
                  </div>
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
