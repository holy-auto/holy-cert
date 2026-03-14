import { requireDealerSession } from "@/lib/market/auth";
import { getListingById } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import ListingFormClient from "../../_ListingFormClient";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function EditInventoryPage({ params }: Params) {
  const session = await requireDealerSession();
  const { id } = await params;

  const listing = await getListingById(id);
  if (!listing || listing.dealer_id !== session.dealer.id) notFound();

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          在庫を編集 — {listing.make} {listing.model}
        </h1>
        <ListingFormClient listing={listing} />
      </main>
    </>
  );
}
