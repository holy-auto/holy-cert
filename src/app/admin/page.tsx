import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import PageHeader from "@/components/ui/PageHeader";
import DashboardCharts from "./DashboardCharts";

async function getMyTenantId(supabase: any) {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .limit(1)
    .single();
  return data?.tenant_id as string | null;
}

type DashboardStats = {
  totalCerts: number;
  activeCerts: number;
  voidCerts: number;
  memberCount: number;
  recentActivity: { date: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
};

async function fetchStats(supabase: any, tenantId: string): Promise<DashboardStats> {
  // 証明書の総数・ステータス別
  const { data: certs } = await supabase
    .from("certificates")
    .select("status,created_at")
    .eq("tenant_id", tenantId);

  const allCerts = certs ?? [];
  const totalCerts = allCerts.length;
  const activeCerts = allCerts.filter((c: any) => c.status === "active").length;
  const voidCerts = allCerts.filter((c: any) => c.status === "void").length;

  // ステータス別集計
  const statusMap = new Map<string, number>();
  for (const c of allCerts) {
    const s = c.status ?? "unknown";
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const statusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));

  // 直近30日の発行数（日別）
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    dateMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of allCerts) {
    if (!c.created_at) continue;
    const date = c.created_at.slice(0, 10);
    if (dateMap.has(date)) {
      dateMap.set(date, (dateMap.get(date) ?? 0) + 1);
    }
  }
  const recentActivity = Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));

  // メンバー数
  const { count: memberCount } = await supabase
    .from("tenant_memberships")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  return {
    totalCerts,
    activeCerts,
    voidCerts,
    memberCount: memberCount ?? 0,
    recentActivity,
    statusBreakdown,
  };
}

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) redirect("/login?next=/admin");

  const tenantId = await getMyTenantId(supabase);

  let stats: DashboardStats | null = null;
  if (tenantId) {
    try {
      stats = await fetchStats(supabase, tenantId);
    } catch {
      stats = null;
    }
  }

  return (
    <main className="space-y-6">
      <PageHeader tag="DASHBOARD" title="ダッシュボード" description="施工証明書の管理状況を一目で確認" />

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-card p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">TOTAL CERTIFICATES</div>
            <div className="mt-2 text-3xl font-bold text-primary">{stats.totalCerts}</div>
            <div className="mt-1 text-xs text-muted">証明書総数</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">ACTIVE</div>
            <div className="mt-2 text-3xl font-bold text-emerald-400">{stats.activeCerts}</div>
            <div className="mt-1 text-xs text-muted">有効な証明書</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">VOID</div>
            <div className="mt-2 text-3xl font-bold text-red-400">{stats.voidCerts}</div>
            <div className="mt-1 text-xs text-muted">無効化済み</div>
          </div>
          <div className="glass-card p-5">
            <div className="text-xs font-semibold tracking-[0.18em] text-muted">MEMBERS</div>
            <div className="mt-2 text-3xl font-bold text-cyan-400">{stats.memberCount}</div>
            <div className="mt-1 text-xs text-muted">チームメンバー</div>
          </div>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <DashboardCharts
          recentActivity={stats.recentActivity}
          statusBreakdown={stats.statusBreakdown}
        />
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold tracking-[0.18em] text-muted mb-3">QUICK ACTIONS</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/certificates"
            className="glass-card p-5 flex items-center gap-4 hover:bg-surface-hover transition-colors group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-dim">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-cyan-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-semibold text-primary group-hover:text-cyan-400 transition-colors">証明書一覧</div>
              <div className="text-xs text-muted">Certificates</div>
            </div>
          </Link>

          <Link
            href="/admin/certificates/new"
            className="glass-card p-5 flex items-center gap-4 hover:bg-surface-hover transition-colors group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-dim">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-semibold text-primary group-hover:text-emerald-400 transition-colors">新規発行</div>
              <div className="text-xs text-muted">New Certificate</div>
            </div>
          </Link>

          <Link
            href="/admin/billing"
            className="glass-card p-5 flex items-center gap-4 hover:bg-surface-hover transition-colors group"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-dim">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} className="text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-semibold text-primary group-hover:text-amber-400 transition-colors">請求・プラン</div>
              <div className="text-xs text-muted">Billing</div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
