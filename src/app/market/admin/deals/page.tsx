import { requireAdminSession } from "../_adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  negotiating: { label: "交渉中",     cls: "bg-blue-100 text-blue-700"   },
  agreed:      { label: "合意済み",   cls: "bg-green-100 text-green-700" },
  completed:   { label: "成立",       cls: "bg-gray-100 text-gray-600"   },
  cancelled:   { label: "キャンセル", cls: "bg-red-100 text-red-600"     },
};

export default async function AdminDealsPage() {
  await requireAdminSession();

  const admin = createAdminClient();
  const { data: deals } = await admin
    .from("deals")
    .select(`
      *,
      listing:inventory_listings(make, model, year),
      buyer:dealers!deals_buyer_dealer_id_fkey(company_name),
      seller:dealers!deals_seller_dealer_id_fkey(company_name)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  const totalAmount = (deals ?? [])
    .filter((d: any) => d.status === "completed" && d.agreed_price)
    .reduce((sum: number, d: any) => sum + d.agreed_price, 0);

  return (
    <AdminLayout title="商談一覧">
      {totalAmount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-6">
          <p className="text-sm text-green-700">
            成立済み取引合計金額: <strong className="text-lg">{(totalAmount / 10000).toFixed(0)}万円</strong>
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">車両</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">購入業者</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">出品業者</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">合意価格</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">ステータス</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">作成日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(deals ?? []).map((deal: any) => {
              const s = STATUS_LABELS[deal.status] ?? { label: deal.status, cls: "bg-gray-100 text-gray-500" };
              return (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {deal.listing?.make} {deal.listing?.model}
                    {deal.listing?.year && <span className="text-gray-400 ml-1">{deal.listing.year}年</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{deal.buyer?.company_name}</td>
                  <td className="px-4 py-3 text-gray-700">{deal.seller?.company_name}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {deal.agreed_price != null
                      ? `${(deal.agreed_price / 10000).toFixed(0)}万円`
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(deal.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!deals?.length && (
          <p className="text-center text-gray-400 text-sm py-8">商談はありません</p>
        )}
      </div>
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
