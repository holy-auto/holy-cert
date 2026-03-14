"use server";

import { requireDealerSession } from "@/lib/market/auth";
import { getMyPrices, upsertPrice, deletePrice } from "@/lib/market/prices-db";
import {
  SERVICE_CATEGORIES,
  CATEGORY_LABEL,
  PRICE_UNITS,
  UNIT_LABEL,
  PREFECTURES,
  fmtPrice,
} from "@/lib/market/constants";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "自社価格管理 | HolyMarket" };

async function handleUpsert(fd: FormData) {
  "use server";
  const { dealer } = await requireDealerSession();
  const id = fd.get("id") as string | null;
  const prefecture = (fd.get("prefecture") as string) || dealer.prefecture || "";

  await upsertPrice(dealer.id, prefecture, {
    id: id || undefined,
    service_category: fd.get("service_category") as string,
    service_name: fd.get("service_name") as string,
    price_min: fd.get("price_min") ? Number(fd.get("price_min")) : null,
    price_max: fd.get("price_max") ? Number(fd.get("price_max")) : null,
    price_typical: fd.get("price_typical") ? Number(fd.get("price_typical")) : null,
    unit: (fd.get("unit") as string) || "per_vehicle",
    notes: (fd.get("notes") as string) || null,
  });
  revalidatePath("/market/prices/my");
  revalidatePath("/market/prices");
  redirect("/market/prices/my");
}

async function handleDelete(fd: FormData) {
  "use server";
  const { dealer } = await requireDealerSession();
  const id = fd.get("id") as string;
  await deletePrice(dealer.id, id);
  revalidatePath("/market/prices/my");
  revalidatePath("/market/prices");
  redirect("/market/prices/my");
}

export default async function MyPricesPage() {
  const { dealer } = await requireDealerSession();
  const prices = await getMyPrices(dealer.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">自社価格を管理</h1>
          <p className="text-sm text-gray-500 mt-1">登録した価格は地域別相場の集計に使用されます</p>
        </div>
        <Link href="/market/prices" className="text-sm text-blue-600 hover:underline">
          ← 相場を見る
        </Link>
      </div>

      {/* 登録フォーム */}
      <section className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">新規追加</h2>
        <form action={handleUpsert} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ <span className="text-red-500">*</span></label>
            <select name="service_category" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">サービス名 <span className="text-red-500">*</span></label>
            <input
              name="service_name" required placeholder="例：フロントガラス断熱フィルム施工"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">都道府県</label>
            <select name="prefecture" defaultValue={dealer.prefecture ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">標準価格（円）</label>
            <input name="price_typical" type="number" min="0" placeholder="30000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">最低価格（円）</label>
            <input name="price_min" type="number" min="0" placeholder="20000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">最高価格（円）</label>
            <input name="price_max" type="number" min="0" placeholder="50000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">単位</label>
            <select name="unit" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {PRICE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">備考</label>
            <input name="notes" placeholder="車種・条件など"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="flex items-end">
            <button type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              登録する
            </button>
          </div>
        </form>
      </section>

      {/* 登録済み一覧 */}
      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">登録済み価格 ({prices.length}件)</h2>
        {prices.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">まだ登録されていません</p>
        ) : (
          <div className="space-y-3">
            {prices.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5">
                      {CATEGORY_LABEL[p.service_category] ?? p.service_category}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{p.service_name}</span>
                    <span className="text-xs text-gray-400">{p.prefecture}</span>
                    <span className="text-xs text-gray-400">/ {UNIT_LABEL[p.unit] ?? p.unit}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-900 font-semibold">{fmtPrice(p.price_typical)}</span>
                    {(p.price_min != null || p.price_max != null) && (
                      <span className="text-gray-500 text-xs">
                        {fmtPrice(p.price_min)} 〜 {fmtPrice(p.price_max)}
                      </span>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-gray-400">{p.notes}</p>}
                </div>
                <form action={handleDelete} className="shrink-0">
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit"
                    className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    削除
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
