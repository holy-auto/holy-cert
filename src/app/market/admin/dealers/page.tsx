import { requireAdminSession } from "../_adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import DealerApprovalClient from "./_DealerApprovalClient";

export default async function AdminDealersPage() {
  await requireAdminSession();

  const admin = createAdminClient();
  const { data: dealers } = await admin
    .from("dealers")
    .select("*")
    .order("created_at", { ascending: false });

  const pending = (dealers ?? []).filter((d: any) => d.status === "pending");
  const approved = (dealers ?? []).filter((d: any) => d.status === "approved");
  const suspended = (dealers ?? []).filter((d: any) => d.status === "suspended");

  return (
    <AdminLayout title="業者管理">
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-amber-700 mb-3">審査待ち（{pending.length}件）</h2>
          <div className="space-y-3">
            {pending.map((d: any) => (
              <div key={d.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">{d.company_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.prefecture ?? "-"} · {d.contact_name ?? "-"} · {new Date(d.created_at).toLocaleDateString("ja-JP")}
                  </p>
                  {d.invite_code && (
                    <p className="text-xs text-gray-400 mt-0.5">招待コード: {d.invite_code}</p>
                  )}
                </div>
                <DealerApprovalClient dealerId={d.id} currentStatus={d.status} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="font-semibold text-gray-700 mb-3">承認済み（{approved.length}件）</h2>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {approved.map((d: any) => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{d.company_name}</p>
                <p className="text-xs text-gray-400">{d.prefecture ?? "-"} · {new Date(d.approved_at ?? d.created_at).toLocaleDateString("ja-JP")} 承認</p>
              </div>
              <DealerApprovalClient dealerId={d.id} currentStatus={d.status} />
            </div>
          ))}
          {approved.length === 0 && <p className="text-center text-gray-400 text-sm py-6">なし</p>}
        </div>
      </section>

      {suspended.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-700 mb-3">停止中（{suspended.length}件）</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {suspended.map((d: any) => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 line-through">{d.company_name}</p>
                </div>
                <DealerApprovalClient dealerId={d.id} currentStatus={d.status} />
              </div>
            ))}
          </div>
        </section>
      )}
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
