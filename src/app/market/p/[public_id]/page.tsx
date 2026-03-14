import { getListingByPublicId } from "@/lib/market/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import PublicImageSlider from "./_PublicImageSlider";

type Params = { params: Promise<{ public_id: string }> };

function fmt(price: number | null) {
  if (price == null) return "応相談";
  return `${(price / 10000).toFixed(0)}万円`;
}

export default async function PublicListingPage({ params }: Params) {
  const { public_id } = await params;
  const listing = await getListingByPublicId(public_id);

  if (!listing || listing.status === "hidden") notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* シンプルヘッダー */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center">
          <span className="font-bold text-blue-700 text-lg">HolyMarket</span>
          <span className="ml-2 text-xs text-gray-400">在庫情報</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左: 画像 + 詳細 */}
          <div className="lg:col-span-2 space-y-4">
            <PublicImageSlider images={listing.images ?? []} alt={`${listing.make} ${listing.model}`} />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">車両情報</h2>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ["メーカー", listing.make],
                    ["モデル", listing.model],
                    ["グレード", listing.grade ?? "-"],
                    ["年式", listing.year ? `${listing.year}年` : "-"],
                    ["走行距離", listing.mileage != null ? `${listing.mileage.toLocaleString()} km` : "-"],
                    ["ボディタイプ", listing.body_type ?? "-"],
                    ["色", listing.color ?? "-"],
                    ["燃料", listing.fuel_type ?? "-"],
                    ["ミッション", listing.transmission ?? "-"],
                    ["車検", listing.has_vehicle_inspection
                      ? (listing.inspection_expiry ? `あり（${listing.inspection_expiry} まで）` : "あり")
                      : "なし"],
                    ["修復歴", listing.has_repair_history
                      ? `あり${listing.repair_history_notes ? `（${listing.repair_history_notes}）` : ""}`
                      : "なし"],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="px-4 py-2.5 font-medium text-gray-500 bg-gray-50 w-28">{label}</td>
                      <td className="px-4 py-2.5 text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {listing.description && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">説明</h2>
                <p className="text-sm text-gray-700 whitespace-pre-line">{listing.description}</p>
              </div>
            )}
          </div>

          {/* 右: 価格・販売店 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h1 className="text-lg font-bold text-gray-900 mb-1">
                {listing.make} {listing.model}
                {listing.grade && <span className="text-sm font-normal text-gray-500 ml-1">{listing.grade}</span>}
              </h1>
              {listing.year && (
                <p className="text-sm text-gray-400 mb-3">{listing.year}年式</p>
              )}
              <p className="text-3xl font-bold text-blue-700 mb-0.5">{fmt(listing.price)}</p>
              <p className="text-xs text-gray-400">税抜き参考価格</p>

              {listing.status === "reserved" && (
                <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 font-medium">
                  現在商談中の車両です
                </div>
              )}
              {listing.status === "sold" && (
                <div className="mt-3 text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2 font-medium">
                  売却済みの車両です
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">販売店</p>
                <p className="text-sm font-medium text-gray-800">{listing.dealer?.company_name}</p>
                {listing.dealer?.prefecture && (
                  <p className="text-xs text-gray-500 mt-0.5">{listing.dealer.prefecture}</p>
                )}
              </div>
            </div>

            {/* 業者向けCTA */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
              <p className="text-sm text-blue-700 font-medium mb-1">業者様・仕入れのお問い合わせ</p>
              <p className="text-xs text-blue-500 mb-3">HolyMarket に登録するとオンラインで問い合わせができます</p>
              <Link
                href="/market/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                ログイン・登録する
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-400">
        HolyMarket — BtoB 中古車在庫共有プラットフォーム
      </footer>
    </div>
  );
}
