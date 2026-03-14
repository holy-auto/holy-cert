import Link from "next/link";
import { requireMarketAdmin } from "@/app/market/admin/_adminAuth";
import { createNews } from "@/lib/market/news-db";
import { NEWS_CATEGORIES } from "@/lib/market/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const metadata = { title: "記事作成 | HolyMarket管理" };

async function handleCreate(fd: FormData) {
  "use server";
  await requireMarketAdmin();
  const is_published = fd.get("is_published") === "on";
  await createNews({
    title: fd.get("title") as string,
    body: fd.get("body") as string,
    category: (fd.get("category") as string) || "general",
    source_url: (fd.get("source_url") as string) || null,
    is_published,
  });
  revalidatePath("/market/admin/news");
  revalidatePath("/market/news");
  redirect("/market/admin/news");
}

export default async function CreateNewsPage() {
  await requireMarketAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/market/admin/news" className="text-sm text-blue-600 hover:underline">
          ← ニュース管理
        </Link>
        <h1 className="text-xl font-bold text-gray-900 mt-2">記事を作成</h1>
      </div>

      <form action={handleCreate} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            name="title" required
            placeholder="記事タイトルを入力"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <select name="category" className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full sm:w-auto">
            {NEWS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            本文 <span className="text-red-500">*</span>
          </label>
          <textarea
            name="body" required rows={12}
            placeholder="記事の本文を入力してください"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">出典URL（任意）</label>
          <input
            name="source_url" type="url"
            placeholder="https://..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" name="is_published" id="is_published" className="rounded" />
          <label htmlFor="is_published" className="text-sm text-gray-700">
            保存と同時に公開する
          </label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            保存
          </button>
          <Link
            href="/market/admin/news"
            className="px-6 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
