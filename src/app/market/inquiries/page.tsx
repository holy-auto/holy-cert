import { requireDealerSession } from "@/lib/market/auth";
import { getDealerInquiries } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open:    { label: "未返信",   className: "bg-blue-100 text-blue-700"   },
  replied: { label: "返信済み", className: "bg-green-100 text-green-700" },
  closed:  { label: "クローズ", className: "bg-gray-100 text-gray-500"   },
  deal:    { label: "商談中",   className: "bg-amber-100 text-amber-700" },
};

export default async function InquiriesPage() {
  const session = await requireDealerSession();
  const inquiries = await getDealerInquiries(session.dealer.id);

  const received = inquiries.filter((i) => i.to_dealer_id === session.dealer.id);
  const sent = inquiries.filter((i) => i.from_dealer_id === session.dealer.id);

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">問い合わせ</h1>

        {/* 受信 */}
        <section className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            受信した問い合わせ
            {received.filter((i) => i.status === "open").length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">
                {received.filter((i) => i.status === "open").length}
              </span>
            )}
          </h2>
          <InquiryList inquiries={received} currentDealerId={session.dealer.id} />
        </section>

        {/* 送信 */}
        <section>
          <h2 className="font-semibold text-gray-700 mb-3">送信した問い合わせ</h2>
          <InquiryList inquiries={sent} currentDealerId={session.dealer.id} />
        </section>
      </main>
    </>
  );
}

function InquiryList({
  inquiries,
  currentDealerId,
}: {
  inquiries: Awaited<ReturnType<typeof getDealerInquiries>>;
  currentDealerId: string;
}) {
  if (inquiries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">問い合わせはありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
      {inquiries.map((inquiry) => {
        const s = STATUS_LABELS[inquiry.status] ?? { label: inquiry.status, className: "bg-gray-100 text-gray-500" };
        const isReceived = inquiry.to_dealer_id === currentDealerId;
        const counterpart = isReceived ? inquiry.from_dealer : inquiry.to_dealer;
        const lastMessage = inquiry.messages?.slice(-1)[0];

        return (
          <Link
            key={inquiry.id}
            href={`/market/inquiries/${inquiry.id}`}
            className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {inquiry.listing?.make} {inquiry.listing?.model}
                  {inquiry.listing?.year && (
                    <span className="text-gray-400 font-normal ml-1">{inquiry.listing.year}年</span>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {isReceived ? "差出人: " : "宛先: "}
                {counterpart?.company_name ?? "-"}
              </p>
              {lastMessage && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{lastMessage.message}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
                {s.label}
              </span>
              <p className="text-xs text-gray-400">
                {new Date(inquiry.updated_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
