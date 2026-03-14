import { requireDealerSession } from "@/lib/market/auth";
import MarketNav from "@/app/market/_components/MarketNav";
import ListingFormClient from "../_ListingFormClient";

export default async function NewInventoryPage() {
  const session = await requireDealerSession();
  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">在庫を追加</h1>
        <ListingFormClient />
      </main>
    </>
  );
}
