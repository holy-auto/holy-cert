import { requireDealerSession } from "@/lib/market/auth";
import { searchListings } from "@/lib/market/db";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";
import type { ListingSearchParams } from "@/types/market";

const PREFECTURES = [
  "北海道","青森","岩手","宮城","秋田","山形","福島",
  "茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
  "新潟","富山","石川","福井","山梨","長野","岐阜",
  "静岡","愛知","三重","滋賀","京都","大阪","兵庫",
  "奈良","和歌山","鳥取","島根","岡山","広島","山口",
  "徳島","香川","愛媛","高知","福岡","佐賀","長崎",
  "熊本","大分","宮崎","鹿児島","沖縄",
];

const BODY_TYPES = ["セダン","SUV","ミニバン","ハッチバック","ワゴン","クーペ","軽自動車","トラック","バン","その他"];
const FUEL_TYPES = ["ガソリン","ディーゼル","ハイブリッド","電気","その他"];
const TRANSMISSIONS = ["AT","MT","CVT","その他"];

function formatPrice(price: number | null): string {
  if (price == null) return "応相談";
  return `${(price / 10000).toFixed(0)}万円`;
}

function formatMileage(mileage: number | null): string {
  if (mileage == null) return "-";
  return `${mileage.toLocaleString()} km`;
}

interface Props {
  searchParams: Promise<Record<string, string>>;
}

export default async function MarketSearchPage({ searchParams }: Props) {
  const session = await requireDealerSession();
  const sp = await searchParams;

  const params: ListingSearchParams = {
    q: sp.q || undefined,
    prefecture: sp.prefecture || undefined,
    make: sp.make || undefined,
    body_type: sp.body_type || undefined,
    fuel_type: sp.fuel_type || undefined,
    transmission: sp.transmission || undefined,
    year_min: sp.year_min ? Number(sp.year_min) : undefined,
    year_max: sp.year_max ? Number(sp.year_max) : undefined,
    price_min: sp.price_min ? Number(sp.price_min) : undefined,
    price_max: sp.price_max ? Number(sp.price_max) : undefined,
    mileage_max: sp.mileage_max ? Number(sp.mileage_max) : undefined,
    has_vehicle_inspection: sp.has_vehicle_inspection === "true" ? true : undefined,
    page: sp.page ? Number(sp.page) : 1,
    limit: 20,
  };

  const { listings, total } = await searchListings(params);
  const totalPages = Math.ceil(total / 20);
  const currentPage = params.page ?? 1;

  return (
    <>
      <MarketNav dealer={session.dealer} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">在庫を探す</h1>
          <p className="text-sm text-gray-500 mt-0.5">参加業者の共有在庫を検索できます</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* フィルタサイドバー */}
          <aside className="lg:w-64 flex-shrink-0">
            <form className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              {/* テキスト検索 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">キーワード</label>
                <input
                  type="text"
                  name="q"
                  defaultValue={sp.q ?? ""}
                  placeholder="メーカー・モデル名など"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 都道府県 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">都道府県</label>
                <select
                  name="prefecture"
                  defaultValue={sp.prefecture ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {PREFECTURES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* ボディタイプ */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ボディタイプ</label>
                <select
                  name="body_type"
                  defaultValue={sp.body_type ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* 燃料タイプ */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">燃料</label>
                <select
                  name="fuel_type"
                  defaultValue={sp.fuel_type ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              {/* ミッション */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ミッション</label>
                <select
                  name="transmission"
                  defaultValue={sp.transmission ?? ""}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">すべて</option>
                  {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* 年式 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">年式</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    name="year_min"
                    defaultValue={sp.year_min ?? ""}
                    placeholder="1990"
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-sm">〜</span>
                  <input
                    type="number"
                    name="year_max"
                    defaultValue={sp.year_max ?? ""}
                    placeholder="2026"
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 価格 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">価格（万円）</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    name="price_min"
                    defaultValue={sp.price_min ? String(Number(sp.price_min) / 10000) : ""}
                    placeholder="0"
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400 text-sm">〜</span>
                  <input
                    type="number"
                    name="price_max"
                    defaultValue={sp.price_max ? String(Number(sp.price_max) / 10000) : ""}
                    placeholder="500"
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 走行距離 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">走行距離（km以内）</label>
                <input
                  type="number"
                  name="mileage_max"
                  defaultValue={sp.mileage_max ?? ""}
                  placeholder="例: 100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 車検あり */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="has_vehicle_inspection"
                  name="has_vehicle_inspection"
                  value="true"
                  defaultChecked={sp.has_vehicle_inspection === "true"}
                  className="rounded border-gray-300"
                />
                <label htmlFor="has_vehicle_inspection" className="text-sm text-gray-700">
                  車検あり
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                検索
              </button>
            </form>
          </aside>

          {/* 検索結果 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">{total}件の在庫が見つかりました</p>
            </div>

            {listings.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-400 text-sm">条件に一致する在庫が見つかりませんでした</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/market/search/${listing.public_id}`}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* サムネイル */}
                    <div className="aspect-video bg-gray-100 relative">
                      {listing.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/${listing.images[0].storage_path}`}
                          alt={`${listing.make} ${listing.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* ステータスバッジ */}
                      {listing.status === "reserved" && (
                        <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                          商談中
                        </span>
                      )}
                    </div>

                    <div className="p-4">
                      <p className="font-semibold text-gray-900 truncate">
                        {listing.make} {listing.model}
                        {listing.grade && <span className="text-gray-500 font-normal ml-1">{listing.grade}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {listing.year ? `${listing.year}年` : "年式不明"} •{" "}
                        {formatMileage(listing.mileage)}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {listing.has_vehicle_inspection && (
                          <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">車検あり</span>
                        )}
                        {!listing.has_repair_history && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">修復歴なし</span>
                        )}
                        {listing.body_type && (
                          <span className="text-xs bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded">{listing.body_type}</span>
                        )}
                      </div>

                      <div className="flex items-end justify-between mt-3">
                        <p className="text-lg font-bold text-blue-700">{formatPrice(listing.price)}</p>
                        <p className="text-xs text-gray-400">{listing.dealer?.company_name ?? ""}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  const qs = new URLSearchParams({ ...sp, page: String(page) }).toString();
                  return (
                    <Link
                      key={page}
                      href={`/market/search?${qs}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        page === currentPage
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
