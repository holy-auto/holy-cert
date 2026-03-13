import { requireAdminSession } from "../_adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  open:    { label: "未返信", cls: "bg-blue-100 text-blue-700" },
  replied: { label: "返信済", cls: "bg-green-100 text-green-700" },
  closed:  { label: "クローズ", cls: "bg-gray-100 text-gray-600" },
  deal:    { label: "商談中", cls: "bg-purple-100 text-purple-700" },
};

export default async function AdminInquiriesPage() {
  await requireAdminSession();

  const admin = createAdminClient();
  const { data: inquiries } = await admin
    .from("listing_inquiries")
    .select(`
      *,
      listing:inventory_listings(make, model, year),
      from_dealer:dealers!listing_inquiries_from_dealer_id_fkey(company_name),
      to_dealer:dealers!listing_inquiries_to_dealer_id_fkey(company_name),
      messages:inquiry_messages(id)
    `)
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <AdminLayout title="問い合わせ一覧">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">車両</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">問い合わせ元</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">出品業者</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">メッセージ数</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">ステータス</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">更新日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(inquiries ?? []).map((inq: any) => {
              const s = STATUS_LABELS[inq.status] ?? { label: inq.status, cls: "bg-gray-100 text-gray-500" };
              return (
                <tr key={inq.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {inq.listing?.make} {inq.listing?.model}
                    {inq.listing?.year && <span className="text-gray-400 ml-1">{inq.listing.year}年</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{inq.from_dealer?.company_name}</td>
                  <td className="px-4 py-3 text-gray-700">{inq.to_dealer?.company_name}</td>
                  <td className="px-4 py-3 text-gray-500">{inq.messages?.length ?? 0}件</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(inq.updated_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!inquiries?.length && (
          <p className="text-center text-gray-400 text-sm py-8">問い合わせはありません</p>
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
