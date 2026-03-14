import Link from "next/link";
import { requireMarketAdmin } from "@/app/market/admin/_adminAuth";
import { getAllNewsAdmin, deleteNews, updateNews } from "@/lib/market/news-db";
import { NEWS_CATEGORY_LABEL, fmtDate } from "@/lib/market/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "ニュース管理 | HolyMarket管理" };

async function handleTogglePublish(fd: FormData) {
  "use server";
  await requireMarketAdmin();
  const id = fd.get("id") as string;
  const is_published = fd.get("is_published") === "true";
  await updateNews(id, {
    is_published: !is_published,
    ...(is_published ? {} : { published_at: new Date().toISOString() }),
  });
  revalidatePath("/market/admin/news");
  redirect("/market/admin/news");
}

async function handleDelete(fd: FormData) {
  "use server";
  await requireMarketAdmin();
  const id = fd.get("id") as string;
  await deleteNews(id);
  revalidatePath("/market/admin/news");
  redirect("/market/admin/news");
}

export default async function AdminNewsPage() {
  await requireMarketAdmin();
  const articles = await getAllNewsAdmin();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">ニュース管理</h1>
        <Link
          href="/market/admin/news/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          記事を作成
        </Link>
      </div>

      <div className="space-y-3">
        {articles.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`inline-flex rounded-full text-[11px] font-semibold px-2.5 py-0.5 ${
                  a.is_published
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {a.is_published ? "公開中" : "下書き"}
                </span>
                <span className="inline-flex rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold px-2 py-0.5">
                  {NEWS_CATEGORY_LABEL[a.category] ?? a.category}
                </span>
                <span className="text-xs text-gray-400">{fmtDate(a.published_at ?? a.created_at)}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{a.title}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <form action={handleTogglePublish}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="is_published" value={String(a.is_published)} />
                <button
                  type="submit"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {a.is_published ? "非公開にする" : "公開する"}
                </button>
              </form>
              <form action={handleDelete}>
                <input type="hidden" name="id" value={a.id} />
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  削除
                </button>
              </form>
            </div>
          </div>
        ))}
        {articles.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10">記事がまだありません</p>
        )}
      </div>
    </div>
  );
}
