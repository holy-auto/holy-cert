import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireDealerSession } from "@/lib/market/auth";
import {
  getJobByPublicId, getBidsForJob, submitBid, acceptBid, cancelJobOrder, completeJob,
} from "@/lib/market/jobs-db";
import { CATEGORY_LABEL, fmtPrice, fmtDate } from "@/lib/market/constants";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "募集中",
  assigned: "受注者決定",
  completed: "完了",
  cancelled: "キャンセル済",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-50 text-emerald-700",
  assigned: "bg-blue-50 text-blue-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};
const BID_STATUS_LABEL: Record<string, string> = { pending: "審査中", accepted: "採用", rejected: "不採用" };
const BID_STATUS_COLOR: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

export default async function JobDetailPage({ params }: { params: Promise<{ public_id: string }> }) {
  const { dealer } = await requireDealerSession();
  const { public_id } = await params;

  const job = await getJobByPublicId(public_id);
  if (!job) notFound();

  const bids = await getBidsForJob(job.id);
  const isPoster = job.poster_dealer_id === dealer.id;
  const myBid = bids.find((b) => b.bidder_dealer_id === dealer.id);

  async function handleBid(fd: FormData) {
    "use server";
    const { dealer: d } = await requireDealerSession();
    await submitBid(job.id, d.id, {
      bid_price: fd.get("bid_price") ? Number(fd.get("bid_price")) : null,
      message: fd.get("message") as string,
    });
    revalidatePath(`/market/jobs/${public_id}`);
    redirect(`/market/jobs/${public_id}`);
  }

  async function handleAccept(fd: FormData) {
    "use server";
    const { dealer: d } = await requireDealerSession();
    const bidId = fd.get("bid_id") as string;
    const bidderDealerId = fd.get("bidder_dealer_id") as string;
    await acceptBid(d.id, job.id, bidId, bidderDealerId);
    revalidatePath(`/market/jobs/${public_id}`);
    redirect(`/market/jobs/${public_id}`);
  }

  async function handleCancel(fd: FormData) {
    "use server";
    const { dealer: d } = await requireDealerSession();
    await cancelJobOrder(d.id, job.id);
    revalidatePath("/market/jobs");
    redirect("/market/jobs/my");
  }

  async function handleComplete(fd: FormData) {
    "use server";
    const { dealer: d } = await requireDealerSession();
    await completeJob(d.id, job.id);
    revalidatePath(`/market/jobs/${public_id}`);
    redirect(`/market/jobs/${public_id}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/market/jobs" className="text-sm text-blue-600 hover:underline">← 受発注一覧</Link>

      {/* 案件詳細 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${STATUS_COLOR[job.status]}`}>
              {STATUS_LABEL[job.status] ?? job.status}
            </span>
            <span className="inline-flex rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold px-2.5 py-0.5">
              {CATEGORY_LABEL[job.service_category] ?? job.service_category}
            </span>
          </div>
          {isPoster && job.status === "open" && (
            <div className="flex gap-2 shrink-0">
              <form action={handleCancel}>
                <button type="submit" className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-lg">
                  キャンセル
                </button>
              </form>
            </div>
          )}
          {isPoster && job.status === "assigned" && (
            <form action={handleComplete}>
              <button type="submit" className="text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700">
                完了にする
              </button>
            </form>
          )}
        </div>

        <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-xs text-gray-400 block">作業場所</span>
            <span className="font-medium">{job.prefecture}{job.city ? ` ${job.city}` : ""}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">予算</span>
            <span className="font-medium">
              {(job.budget_min || job.budget_max)
                ? `${fmtPrice(job.budget_min)} 〜 ${fmtPrice(job.budget_max)}`
                : "応相談"}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">希望作業日</span>
            <span className="font-medium">{fmtDate(job.desired_date)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">応募締め切り</span>
            <span className="font-medium">{fmtDate(job.deadline)}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">発注者</span>
            <span className="font-medium">{job.poster?.company_name}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">投稿日</span>
            <span className="font-medium">{fmtDate(job.created_at)}</span>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-1">作業内容・詳細</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
        </div>
      </div>

      {/* 応募フォーム（他店のみ、status=open のみ） */}
      {!isPoster && job.status === "open" && !myBid && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">この案件に応募する</h2>
          <form action={handleBid} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">見積金額（円・任意）</label>
              <input name="bid_price" type="number" min="0" placeholder="20000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メッセージ <span className="text-red-500">*</span>
              </label>
              <textarea
                name="message" required rows={4}
                placeholder="自社の実績・対応可能な日程・質問などを記載してください"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y"
              />
            </div>
            <button type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              応募する
            </button>
          </form>
        </div>
      )}

      {/* 自分の応募状況 */}
      {!isPoster && myBid && (
        <div className={`border rounded-2xl p-4 ${BID_STATUS_COLOR[myBid.status]?.replace("text-", "border-").replace("-700", "-200").replace("-600", "-200") ?? "border-gray-200"} bg-white`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${BID_STATUS_COLOR[myBid.status]}`}>
              {BID_STATUS_LABEL[myBid.status] ?? myBid.status}
            </span>
            <span className="text-sm font-medium text-gray-700">応募済み</span>
          </div>
          {myBid.bid_price && (
            <p className="text-sm text-gray-600">見積: {fmtPrice(myBid.bid_price)}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">{myBid.message}</p>
        </div>
      )}

      {/* 応募一覧（発注者のみ） */}
      {isPoster && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">応募一覧 ({bids.length}件)</h2>
          {bids.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">まだ応募がありません</p>
          ) : (
            bids.map((bid) => (
              <div key={bid.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${BID_STATUS_COLOR[bid.status]}`}>
                        {BID_STATUS_LABEL[bid.status] ?? bid.status}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{bid.bidder?.company_name}</span>
                      <span className="text-xs text-gray-400">{bid.bidder?.prefecture}</span>
                    </div>
                    {bid.bid_price && (
                      <p className="text-sm font-medium text-gray-800 mt-1">見積: {fmtPrice(bid.bid_price)}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{bid.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(bid.created_at)}</p>
                  </div>
                  {job.status === "open" && bid.status === "pending" && (
                    <form action={handleAccept} className="shrink-0">
                      <input type="hidden" name="bid_id" value={bid.id} />
                      <input type="hidden" name="bidder_dealer_id" value={bid.bidder_dealer_id} />
                      <button type="submit"
                        className="bg-emerald-600 text-white text-xs px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
                        採用する
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
