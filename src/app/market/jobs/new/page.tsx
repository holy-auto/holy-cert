import Link from "next/link";
import { requireDealerSession } from "@/lib/market/auth";
import { createJobOrder } from "@/lib/market/jobs-db";
import { SERVICE_CATEGORIES, PREFECTURES } from "@/lib/market/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const metadata = { title: "案件を投稿 | HolyMarket" };

async function handleCreate(fd: FormData) {
  "use server";
  const { dealer } = await requireDealerSession();
  await createJobOrder(dealer.id, dealer.prefecture ?? "", {
    title: fd.get("title") as string,
    description: fd.get("description") as string,
    service_category: fd.get("service_category") as string,
    prefecture: fd.get("prefecture") as string,
    city: (fd.get("city") as string) || null,
    budget_min: fd.get("budget_min") ? Number(fd.get("budget_min")) : null,
    budget_max: fd.get("budget_max") ? Number(fd.get("budget_max")) : null,
    desired_date: (fd.get("desired_date") as string) || null,
    deadline: (fd.get("deadline") as string) || null,
  });
  revalidatePath("/market/jobs");
  redirect("/market/jobs/my");
}

export default async function NewJobPage() {
  const { dealer } = await requireDealerSession();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/market/jobs" className="text-sm text-blue-600 hover:underline">← 受発注一覧</Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">案件を投稿する</h1>
        <p className="text-sm text-gray-500 mt-1">
          依頼内容を登録すると、他の施行店から応募が届きます
        </p>
      </div>

      <form action={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            案件タイトル <span className="text-red-500">*</span>
          </label>
          <input
            name="title" required placeholder="例：フロントガラスフィルム貼り付け 1台"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              サービスカテゴリ <span className="text-red-500">*</span>
            </label>
            <select name="service_category" required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              作業場所（都道府県）<span className="text-red-500">*</span>
            </label>
            <select name="prefecture" required defaultValue={dealer.prefecture ?? ""}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">選択してください</option>
              {PREFECTURES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">市区町村（任意）</label>
            <input name="city" placeholder="例：横浜市"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            作業内容・詳細 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description" required rows={5}
            placeholder="車両情報、作業内容、注意事項など詳しく記載してください"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">予算（下限 円）</label>
            <input name="budget_min" type="number" min="0" placeholder="10000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">予算（上限 円）</label>
            <input name="budget_max" type="number" min="0" placeholder="30000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">希望作業日</label>
            <input name="desired_date" type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">応募締め切り</label>
            <input name="deadline" type="date"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            投稿する
          </button>
          <Link href="/market/jobs"
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
