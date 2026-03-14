import { requireDealerSession } from "@/lib/market/auth";
import { getDealerDeals } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  negotiating: { label: "交渉中",   className: "bg-blue-100 text-blue-700"   },
  agreed:      { label: "合意済み", className: "bg-green-100 text-green-700" },
  completed:   { label: "成立",     className: "bg-gray-100 text-gray-600"   },
  cancelled:   { label: "キャンセル", className: "bg-red-100 text-red-600"   },
};

export default async function DealsPage() {
  const session = await requireDealerSession();
  const deals = await getDealerDeals(session.dealer.id);

  const active = deals.filter((d) => d.status === "negotiating" || d.status === "agreed");
  const past = deals.filter((d) => d.status === "completed" || d.status === "cancelled");

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">商談</h1>

        <section className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-3">進行中の商談</h2>
          <DealList deals={active} currentDealerId={session.dealer.id} />
        </section>

        <section>
          <h2 className="font-semibold text-gray-700 mb-3">過去の商談</h2>
          <DealList deals={past} currentDealerId={session.dealer.id} />
        </section>
      </main>
    </>
  );
}

function DealList({
  deals,
  currentDealerId,
}: {
  deals: Awaited<ReturnType<typeof getDealerDeals>>;
  currentDealerId: string;
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-sm text-gray-400">商談はありません</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
      {deals.map((deal) => {
        const s = STATUS_LABELS[deal.status] ?? { label: deal.status, className: "bg-gray-100 text-gray-500" };
        const isBuyer = deal.buyer_dealer_id === currentDealerId;

        return (
          <Link
            key={deal.id}
            href={`/market/deals/${deal.id}`}
            className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">
                {deal.listing?.make} {deal.listing?.model}
                {deal.listing?.year && (
                  <span className="text-gray-400 font-normal ml-1">{deal.listing.year}年</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isBuyer ? "購入" : "売却"} ·{" "}
                {isBuyer
                  ? `出品: ${deal.seller?.company_name}`
                  : `購入: ${deal.buyer?.company_name}`}
              </p>
              {deal.agreed_price != null && (
                <p className="text-xs text-blue-600 mt-0.5">
                  合意価格: {(deal.agreed_price / 10000).toFixed(0)}万円
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
                {s.label}
              </span>
              <p className="text-xs text-gray-400">
                {new Date(deal.created_at).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
