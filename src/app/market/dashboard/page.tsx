import { requireDealerSession } from "@/lib/market/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import MarketNav from "@/app/market/_components/MarketNav";
import Link from "next/link";

export default async function MarketDashboardPage() {
  const session = await requireDealerSession();
  const { dealer } = session;
  const admin = createAdminClient();

  // 統計情報を並列取得
  const [listingsRes, inquiriesRes, dealsRes] = await Promise.all([
    admin
      .from("inventory_listings")
      .select("id, status", { count: "exact" })
      .eq("dealer_id", dealer.id),
    admin
      .from("listing_inquiries")
      .select("id, status", { count: "exact" })
      .or(`from_dealer_id.eq.${dealer.id},to_dealer_id.eq.${dealer.id}`),
    admin
      .from("deals")
      .select("id, status", { count: "exact" })
      .or(`buyer_dealer_id.eq.${dealer.id},seller_dealer_id.eq.${dealer.id}`),
  ]);

  const listings = listingsRes.data ?? [];
  const inquiries = inquiriesRes.data ?? [];
  const deals = dealsRes.data ?? [];

  const activeListings = listings.filter((l) => l.status === "active").length;
  const openInquiries = inquiries.filter((i) => i.status === "open" || i.status === "replied").length;
  const activeDeals = deals.filter((d) => d.status === "negotiating" || d.status === "agreed").length;

  const stats = [
    { label: "掲載中の在庫", value: activeListings, href: "/market/inventory", color: "blue" },
    { label: "未対応の問い合わせ", value: openInquiries, href: "/market/inquiries", color: "amber" },
    { label: "進行中の商談", value: activeDeals, href: "/market/deals", color: "green" },
    { label: "総在庫数", value: listings.length, href: "/market/inventory", color: "gray" },
  ];

  return (
    <>
      <MarketNav dealer={dealer} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{dealer.company_name}</h1>
          <p className="text-gray-500 text-sm mt-1">ダッシュボード</p>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow"
            >
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/market/inventory/new"
            className="flex flex-col items-center justify-center gap-2 bg-blue-600 text-white rounded-xl p-6 hover:bg-blue-700 transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="font-semibold">在庫を登録する</span>
            <span className="text-xs text-blue-200">新しい車両を掲載</span>
          </Link>

          <Link
            href="/market/search"
            className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl p-6 hover:shadow-sm transition-shadow"
          >
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="font-semibold">在庫を探す</span>
            <span className="text-xs text-gray-400">全業者の在庫を検索</span>
          </Link>

          <Link
            href="/market/inquiries"
            className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 rounded-xl p-6 hover:shadow-sm transition-shadow"
          >
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-semibold">問い合わせ確認</span>
            <span className="text-xs text-gray-400">受信・送信メッセージ</span>
          </Link>
        </div>
      </main>
    </>
  );
}
