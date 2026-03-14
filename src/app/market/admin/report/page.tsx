import { requireAdminSession } from "../_adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function AdminReportPage() {
  await requireAdminSession();

  const admin = createAdminClient();

  // 全商談（成立済み）
  const { data: completedDeals } = await admin
    .from("deals")
    .select(`
      *,
      listing:inventory_listings(make, model, year),
      buyer:dealers!deals_buyer_dealer_id_fkey(id, company_name),
      seller:dealers!deals_seller_dealer_id_fkey(id, company_name)
    `)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  // 業者ごとの集計
  const dealerStats: Record<string, {
    company_name: string;
    sales_count: number;
    sales_amount: number;
    purchase_count: number;
    purchase_amount: number;
  }> = {};

  for (const deal of (completedDeals ?? []) as any[]) {
    const sellerId = deal.seller_dealer_id;
    const buyerId = deal.buyer_dealer_id;
    const price = deal.agreed_price ?? 0;

    if (!dealerStats[sellerId]) {
      dealerStats[sellerId] = {
        company_name: deal.seller?.company_name ?? sellerId,
        sales_count: 0, sales_amount: 0,
        purchase_count: 0, purchase_amount: 0,
      };
    }
    if (!dealerStats[buyerId]) {
      dealerStats[buyerId] = {
        company_name: deal.buyer?.company_name ?? buyerId,
        sales_count: 0, sales_amount: 0,
        purchase_count: 0, purchase_amount: 0,
      };
    }
    dealerStats[sellerId].sales_count++;
    dealerStats[sellerId].sales_amount += price;
    dealerStats[buyerId].purchase_count++;
    dealerStats[buyerId].purchase_amount += price;
  }

  const sorted = Object.entries(dealerStats)
    .map(([id, stats]) => ({ id, ...stats, total: stats.sales_amount + stats.purchase_amount }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = (completedDeals ?? []).reduce((sum: number, d: any) => sum + (d.agreed_price ?? 0), 0);

  // 月別成立数
  const monthlyStats: Record<string, number> = {};
  for (const deal of (completedDeals ?? []) as any[]) {
    const month = deal.created_at.slice(0, 7); // YYYY-MM
    monthlyStats[month] = (monthlyStats[month] ?? 0) + 1;
  }
  const monthlySorted = Object.entries(monthlyStats).sort(([a], [b]) => b.localeCompare(a)).slice(0, 12);

  return (
    <AdminLayout title="売買実績レポート">
      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "成立件数", value: `${completedDeals?.length ?? 0}件` },
          { label: "成立取引総額", value: `${(grandTotal / 10000).toFixed(0)}万円` },
          { label: "取引業者数", value: `${sorted.length}社` },
          { label: "平均取引額", value: completedDeals?.length
            ? `${(grandTotal / 10000 / completedDeals.length).toFixed(0)}万円`
            : "-" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 月別 */}
      {monthlySorted.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-gray-700 mb-3">月別成立件数（直近12ヶ月）</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-end gap-2 h-32">
              {(() => {
                const max = Math.max(...monthlySorted.map(([, v]) => v), 1);
                return monthlySorted.reverse().map(([month, count]) => (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500">{count}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(count / max) * 100}px`, minHeight: "4px" }}
                    />
                    <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left">{month.slice(5)}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
      )}

      {/* 業者別実績 */}
      <section>
        <h2 className="font-semibold text-gray-700 mb-3">業者別実績</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">業者名</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">売却件数</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">売却総額</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">購入件数</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">購入総額</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">合計金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((stat) => (
                <tr key={stat.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{stat.company_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{stat.sales_count}件</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {stat.sales_amount > 0 ? `${(stat.sales_amount / 10000).toFixed(0)}万円` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{stat.purchase_count}件</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {stat.purchase_amount > 0 ? `${(stat.purchase_amount / 10000).toFixed(0)}万円` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">
                    {stat.total > 0 ? `${(stat.total / 10000).toFixed(0)}万円` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">成立済み取引はありません</p>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

function AdminLayout({ title, children }: { title: string; children: React.ReactNode }) {
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}
