import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import PageHeader from "@/components/ui/PageHeader";
import Link from "next/link";

export default async function OperatorDashboard() {
  const admin = createSupabaseAdminClient();

  // Fetch stats in parallel
  const [tenantsRes, ticketsRes, certsRes] = await Promise.all([
    admin.from("tenants").select("id", { count: "exact", head: true }),
    admin.from("support_tickets").select("id,status", { count: "exact" }).eq("status", "open"),
    admin.from("certificates").select("id", { count: "exact", head: true }),
  ]);

  const totalTenants = tenantsRes.count ?? 0;
  const openTickets = ticketsRes.count ?? 0;
  const totalCerts = certsRes.count ?? 0;

  // Recent tickets
  const { data: recentTickets } = await admin
    .from("support_tickets")
    .select("id,subject,status,priority,created_at,tenant_id")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        tag="運営"
        title="CARTRUST 運営ダッシュボード"
        description="プラットフォーム全体の状況を確認します。"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-card p-5">
          <div className="text-xs text-muted">登録テナント数</div>
          <div className="mt-1 text-2xl font-bold text-primary">{totalTenants}</div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted">未対応サポート</div>
          <div className={`mt-1 text-2xl font-bold ${openTickets > 0 ? "text-red-500" : "text-emerald-500"}`}>
            {openTickets}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="text-xs text-muted">証明書発行数</div>
          <div className="mt-1 text-2xl font-bold text-primary">{totalCerts}</div>
        </div>
      </div>

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/operator/tenants" className="btn-primary">テナント管理</Link>
        <Link href="/operator/support-tickets" className="btn-secondary">サポート対応</Link>
        <Link href="/operator/announcements" className="btn-secondary">お知らせ配信</Link>
      </div>

      {/* Recent support tickets */}
      <section className="glass-card p-5">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-[0.18em] text-muted">サポート</div>
          <div className="mt-1 text-base font-semibold text-primary">最新のサポート問い合わせ</div>
        </div>
        {(!recentTickets || recentTickets.length === 0) ? (
          <p className="text-sm text-muted">サポート問い合わせはありません</p>
        ) : (
          <div className="divide-y divide-border-subtle">
            {recentTickets.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-primary truncate">{t.subject}</div>
                  <div className="text-xs text-muted mt-0.5">テナント: {String(t.tenant_id).slice(0, 8)}...</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    t.status === "open" ? "bg-blue-100 text-blue-700" :
                    t.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                    "bg-neutral-100 text-neutral-500"
                  }`}>
                    {t.status === "open" ? "対応待ち" : t.status === "in_progress" ? "対応中" : t.status === "resolved" ? "解決済み" : "クローズ"}
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
