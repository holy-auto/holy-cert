import Link from "next/link";
import { requireDealerSession } from "@/lib/market/auth";
import { getAllPrices, aggregatePrices } from "@/lib/market/prices-db";
import { SERVICE_CATEGORIES, CATEGORY_LABEL, REGIONS, fmtPrice } from "@/lib/market/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "工賃相場 | HolyMarket" };

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; region?: string }>;
}) {
  const { dealer } = await requireDealerSession();
  const { category: selCategory, region: selRegion } = await searchParams;

  const allPrices = await getAllPrices();
  const averages = aggregatePrices(allPrices);

  // フィルタ適用
  const regions = selRegion
    ? REGIONS.filter((r) => r.name === selRegion)
    : REGIONS;

  const categories = selCategory
    ? SERVICE_CATEGORIES.filter((c) => c.value === selCategory)
    : SERVICE_CATEGORIES;

  // region × category のテーブルを組み立て
  const getAvg = (prefecture: string, cat: string) =>
    averages.find((a) => a.prefecture === prefecture && a.service_category === cat);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工賃・施工価格 相場</h1>
          <p className="text-sm text-gray-500 mt-1">
            全国 {new Set(allPrices.map((p) => p.dealer_id)).size} 社の施行店が登録した価格をもとに算出
          </p>
        </div>
        <Link
          href="/market/prices/my"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          自社価格を登録・管理
        </Link>
      </div>

      {/* フィルタ */}
      <form method="get" className="flex flex-wrap gap-3 bg-gray-50 rounded-xl p-4">
        <select
          name="category"
          defaultValue={selCategory ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">全カテゴリ</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          name="region"
          defaultValue={selRegion ?? ""}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        >
          <option value="">全地域</option>
          {REGIONS.map((r) => (
            <option key={r.name} value={r.name}>{r.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          絞り込む
        </button>
        {(selCategory || selRegion) && (
          <Link href="/market/prices" className="text-sm text-gray-500 hover:text-gray-700 self-center">
            クリア
          </Link>
        )}
      </form>

      {/* 地域 × カテゴリ テーブル */}
      {regions.map((region) => {
        const prefsByRegion = region.prefectures;
        const hasData = prefsByRegion.some((pref) =>
          categories.some((cat) => getAvg(pref, cat.value))
        );
        if (!hasData) return null;

        return (
          <section key={region.name} className="space-y-3">
            <h2 className="text-sm font-semibold tracking-[0.15em] text-gray-500 uppercase">
              {region.name}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-24">都道府県</th>
                    {categories.map((c) => (
                      <th key={c.value} className="px-4 py-3 text-center font-semibold text-gray-700">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {prefsByRegion.map((pref) => {
                    const rowData = categories.map((cat) => getAvg(pref, cat.value));
                    if (rowData.every((d) => !d)) return null;
                    return (
                      <tr key={pref} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{pref}</td>
                        {rowData.map((d, i) => (
                          <td key={i} className="px-4 py-3 text-center">
                            {d ? (
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {fmtPrice(d.avg_typical || undefined)}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {fmtPrice(d.avg_min || undefined)} 〜 {fmtPrice(d.avg_max || undefined)}
                                </div>
                                <div className="text-[10px] text-gray-300">{d.count}件</div>
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {allPrices.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">まだ価格データがありません</p>
          <p className="text-sm mt-2">最初に自社の価格を登録してみましょう</p>
          <Link
            href="/market/prices/my"
            className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            価格を登録する
          </Link>
        </div>
      )}

      {/* 凡例 */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4 space-y-1">
        <p>・表示価格は登録された価格の平均値です。消費税の扱いは各社異なります。</p>
        <p>・上段：標準価格（平均）　下段：最低〜最高の平均レンジ　右下：データ件数</p>
        <p>・価格データは各施行店が任意で登録したものです。実際の価格は施行条件により異なります。</p>
      </div>
    </div>
  );
}
