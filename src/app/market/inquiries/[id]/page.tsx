import { requireDealerSession } from "@/lib/market/auth";
import { getInquiryById } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReplyFormClient from "./_ReplyFormClient";
import DealButtonClient from "./_DealButtonClient";

type Params = { params: Promise<{ id: string }> };

export default async function InquiryDetailPage({ params }: Params) {
  const session = await requireDealerSession();
  const { id } = await params;

  const inquiry = await getInquiryById(id, session.dealer.id);
  if (!inquiry) notFound();

  const isOwner = inquiry.to_dealer_id === session.dealer.id;
  const canDeal = isOwner && inquiry.status !== "deal" && inquiry.status !== "closed";
  const canReply = inquiry.status !== "closed";

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ヘッダー */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/market/inquiries" className="hover:text-gray-700">問い合わせ</Link>
          <span>/</span>
          <span className="text-gray-900">
            {inquiry.listing?.make} {inquiry.listing?.model}
          </span>
        </nav>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          {/* 在庫情報 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div>
              <Link
                href={`/market/search/${inquiry.listing?.public_id}`}
                className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {inquiry.listing?.make} {inquiry.listing?.model}
                {inquiry.listing?.year && (
                  <span className="text-gray-400 font-normal ml-1">{inquiry.listing.year}年</span>
                )}
              </Link>
              <p className="text-xs text-gray-400 mt-0.5">
                {inquiry.listing?.price != null
                  ? `${(inquiry.listing.price / 10000).toFixed(0)}万円`
                  : "価格: 応相談"}
              </p>
            </div>
            <StatusBadge status={inquiry.status} />
          </div>

          {/* メッセージスレッド */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {(inquiry.messages ?? []).map((msg) => {
              const isMine = msg.sender_dealer_id === session.dealer.id;
              const sender = isMine
                ? session.dealer.company_name
                : (isMine ? inquiry.to_dealer.company_name : inquiry.from_dealer.company_name);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                >
                  <p className="text-xs text-gray-400 mb-1">{sender}</p>
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                      isMine
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : "bg-gray-100 text-gray-900 rounded-tl-sm"
                    }`}
                  >
                    {msg.message}
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(msg.created_at).toLocaleString("ja-JP")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* 返信フォーム */}
          {canReply && (
            <div className="border-t border-gray-100">
              <ReplyFormClient inquiryId={id} />
            </div>
          )}
        </div>

        {/* 商談開始ボタン（出品者のみ） */}
        {canDeal && (
          <DealButtonClient
            inquiryId={id}
            listingId={inquiry.listing_id}
          />
        )}
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    open:    { label: "未返信",   className: "bg-blue-100 text-blue-700"   },
    replied: { label: "返信済み", className: "bg-green-100 text-green-700" },
    closed:  { label: "クローズ", className: "bg-gray-100 text-gray-500"   },
    deal:    { label: "商談中",   className: "bg-amber-100 text-amber-700" },
  };
  const s = map[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
