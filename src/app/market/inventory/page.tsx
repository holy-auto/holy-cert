import { requireDealerSession } from "@/lib/market/auth";
import { getDealerListings } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:   { label: "掲載中",   className: "bg-green-100 text-green-700" },
  reserved: { label: "商談中",   className: "bg-amber-100 text-amber-700" },
  sold:     { label: "売却済",   className: "bg-gray-100 text-gray-500"   },
  hidden:   { label: "非公開",   className: "bg-red-100 text-red-700"     },
};

export default async function InventoryPage() {
  const session = await requireDealerSession();
  const listings = await getDealerListings(session.dealer.id);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">自社在庫</h1>
            <p className="text-sm text-gray-500 mt-0.5">{listings.length}件の在庫</p>
          </div>
          <Link
            href="/market/inventory/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 在庫を追加
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">まだ在庫が登録されていません</p>
            <Link
              href="/market/inventory/new"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              最初の在庫を追加する
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-16">画像</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">車両</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">走行距離</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">価格</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ステータス</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">掲載日</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {listings.map((listing) => {
                  const s = STATUS_LABELS[listing.status] ?? { label: listing.status, className: "bg-gray-100 text-gray-500" };
                  return (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="w-14 h-10 bg-gray-100 rounded overflow-hidden">
                          {listing.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${supabaseUrl}/storage/v1/object/public/assets/${listing.images[0].storage_path}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {listing.make} {listing.model}
                        </p>
                        {listing.year && (
                          <p className="text-xs text-gray-400">{listing.year}年</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {listing.mileage != null ? `${listing.mileage.toLocaleString()} km` : "-"}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell font-medium text-blue-700">
                        {listing.price != null ? `${(listing.price / 10000).toFixed(0)}万円` : "応相談"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.className}`}>
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-xs">
                        {new Date(listing.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/market/inventory/${listing.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium mr-3"
                        >
                          編集
                        </Link>
                        <Link
                          href={`/market/search/${listing.public_id}`}
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          表示
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
