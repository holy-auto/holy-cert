import { requireDealerSession } from "@/lib/market/auth";
import MarketNav from "@/app/market/_components/MarketNav";
import CsvImportClient from "./_CsvImportClient";

export default async function CsvImportPage() {
  const session = await requireDealerSession();
  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">在庫 CSV 一括インポート</h1>
        <p className="text-sm text-gray-500 mb-6">CSVファイルで複数の在庫を一括登録できます。</p>
        <CsvImportClient />
      </main>
    </>
  );
}
