import Link from "next/link";
import { requireDealerSession } from "@/lib/market/auth";
import { getMyPostedJobs, getMyBids } from "@/lib/market/jobs-db";
import { CATEGORY_LABEL, fmtPrice, fmtDate } from "@/lib/market/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "自分の案件 | HolyMarket" };

const STATUS_LABEL: Record<string, string> = {
  open: "募集中",
  assigned: "受注者決定",
  completed: "完了",
  cancelled: "キャンセル",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700",
  assigned: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

export default async function MyJobsPage() {
  const { dealer } = await requireDealerSession();
  const [postedJobs, myBids] = await Promise.all([
    getMyPostedJobs(dealer.id),
    getMyBids(dealer.id),
  ]);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">自分の案件</h1>
        <Link href="/market/jobs/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          案件を投稿
        </Link>
      </div>

      {/* 発注した案件 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.15em] text-gray-500">発注した案件</h2>
        {postedJobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">発注した案件はありません</p>
        ) : (
          postedJobs.map((job) => (
            <Link key={job.id} href={`/market/jobs/${job.public_id}`}
              className="group block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${STATUS_COLOR[job.status]}`}>
                      {STATUS_LABEL[job.status] ?? job.status}
                    </span>
                    <span className="text-xs text-gray-400">{CATEGORY_LABEL[job.service_category] ?? job.service_category}</span>
                    <span className="text-xs text-gray-400">{job.prefecture}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{job.title}</p>
                  <p className="text-xs text-gray-400">投稿: {fmtDate(job.created_at)}</p>
                </div>
                <span className="text-gray-400 group-hover:text-blue-500 shrink-0">→</span>
              </div>
            </Link>
          ))
        )}
      </section>

      {/* 応募した案件 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-[0.15em] text-gray-500">応募した案件</h2>
        {myBids.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">応募した案件はありません</p>
        ) : (
          myBids.map((bid) => {
            const job = bid.job_orders;
            return (
              <Link key={bid.id} href={`/market/jobs/${job.public_id}`}
                className="group block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${STATUS_COLOR[job.status]}`}>
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                      <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${
                        bid.status === "accepted" ? "bg-emerald-50 text-emerald-700" :
                        bid.status === "rejected" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        応募: {bid.status === "accepted" ? "採用" : bid.status === "rejected" ? "不採用" : "審査中"}
                      </span>
                      <span className="text-xs text-gray-400">{CATEGORY_LABEL[job.service_category] ?? job.service_category}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{job.title}</p>
                    {bid.bid_price && (
                      <p className="text-xs text-gray-500">見積: {fmtPrice(bid.bid_price)}</p>
                    )}
                  </div>
                  <span className="text-gray-400 group-hover:text-blue-500 shrink-0">→</span>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </div>
  );
}
