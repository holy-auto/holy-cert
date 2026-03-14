import { requireAdminSession } from "./_adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminPage() {
  await requireAdminSession();

  const admin = createAdminClient();

  const [
    { count: dealerCount },
    { count: pendingCount },
    { count: listingCount },
    { count: inquiryCount },
    { count: dealCount },
  ] = await Promise.all([
    admin.from("dealers").select("*", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("dealers").select("*", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("inventory_listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("listing_inquiries").select("*", { count: "exact", head: true }),
    admin.from("deals").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/market/dashboard" className="font-bold text-blue-700 text-lg">HolyMarket</Link>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">管理者</span>
          </div>
          <nav className="flex gap-1">
            {[
              { href: "/market/admin", label: "ダッシュボード" },
              { href: "/market/admin/dealers", label: "業者管理" },
              { href: "/market/admin/news", label: "ニュース管理" },
              { href: "/market/admin/inquiries", label: "問い合わせ" },
              { href: "/market/admin/deals", label: "商談" },
              { href: "/market/admin/report", label: "レポート" },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">管理ダッシュボード</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "承認済み業者", value: dealerCount ?? 0, color: "text-green-600" },
            { label: "審査待ち", value: pendingCount ?? 0, color: "text-amber-600" },
            { label: "掲載中在庫", value: listingCount ?? 0, color: "text-blue-600" },
            { label: "問い合わせ数", value: inquiryCount ?? 0, color: "text-gray-700" },
            { label: "商談数", value: dealCount ?? 0, color: "text-purple-600" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {pendingCount && pendingCount > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800">
              {pendingCount}件の業者が審査待ちです
            </p>
            <Link href="/market/admin/dealers" className="text-sm text-amber-700 hover:underline mt-1 inline-block">
              業者管理ページを確認 →
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}
