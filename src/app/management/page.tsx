import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagementDashboard() {
  const supabase = createAdminClient();

  const [tenantsRes, certsRes, activeTenantRes] = await Promise.all([
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("certificates").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const totalTenants = tenantsRes.count ?? 0;
  const totalCerts = certsRes.count ?? 0;
  const activeTenants = activeTenantRes.count ?? 0;
  const inactiveTenants = totalTenants - activeTenants;

  // Plan distribution
  const { data: planRows } = await supabase
    .from("tenants")
    .select("plan_tier");

  const planDist: Record<string, number> = { mini: 0, standard: 0, pro: 0 };
  for (const row of planRows ?? []) {
    const tier = String(row.plan_tier ?? "mini");
    planDist[tier] = (planDist[tier] ?? 0) + 1;
  }

  // Recent certificates (latest 10)
  const { data: recentCerts } = await supabase
    .from("certificates")
    .select("public_id, customer_name, status, created_at, tenant_id")
    .order("created_at", { ascending: false })
    .limit(10);

  // Get tenant names for recent certs
  const tenantIds = [...new Set((recentCerts ?? []).map((c) => c.tenant_id))];
  const { data: tenantNames } = tenantIds.length > 0
    ? await supabase.from("tenants").select("id, name").in("id", tenantIds)
    : { data: [] };
  const tenantMap = new Map((tenantNames ?? []).map((t) => [t.id, t.name]));

  const stats = [
    { label: "TENANTS", value: totalTenants, sub: "テナント総数", href: "/management/tenants" },
    { label: "ACTIVE", value: activeTenants, sub: "アクティブテナント", color: "text-emerald-600" },
    { label: "INACTIVE", value: inactiveTenants, sub: "停止中テナント", color: inactiveTenants > 0 ? "text-amber-600" : "" },
    { label: "CERTIFICATES", value: totalCerts, sub: "証明書総数", href: "/management/certificates" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
          PLATFORM OVERVIEW
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          CARTRUST 管理運営
        </h1>
        <p className="text-sm text-neutral-600">全テナント横断のプラットフォーム統計</p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const inner = (
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">{s.label}</div>
              <div className={`mt-2 text-2xl font-bold ${s.color ?? "text-neutral-900"}`}>{s.value}</div>
              <div className="mt-1 text-xs text-neutral-500">{s.sub}</div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>{inner}</Link>
          ) : (
            <div key={s.label}>{inner}</div>
          );
        })}
      </section>

      {/* Plan Distribution */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500">プラン別テナント分布</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["mini", "standard", "pro"] as const).map((tier) => (
            <div key={tier} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase">{tier}</div>
              <div className="mt-2 text-2xl font-bold text-neutral-900">{planDist[tier]}</div>
              <div className="mt-1 text-xs text-neutral-500">テナント</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Certificates */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500">最近発行された証明書</h2>
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr>
                <th className="p-3 text-left font-semibold text-neutral-600">作成日時</th>
                <th className="p-3 text-left font-semibold text-neutral-600">テナント</th>
                <th className="p-3 text-left font-semibold text-neutral-600">証明書 ID</th>
                <th className="p-3 text-left font-semibold text-neutral-600">顧客名</th>
                <th className="p-3 text-left font-semibold text-neutral-600">ステータス</th>
              </tr>
            </thead>
            <tbody>
              {(recentCerts ?? []).map((c) => (
                <tr key={c.public_id} className="border-t hover:bg-neutral-50">
                  <td className="p-3 whitespace-nowrap text-neutral-600">
                    {new Date(c.created_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-3 text-neutral-700">{tenantMap.get(c.tenant_id) ?? c.tenant_id}</td>
                  <td className="p-3 font-mono text-xs text-neutral-700">{c.public_id}</td>
                  <td className="p-3 font-medium text-neutral-900">{c.customer_name}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                      c.status === "active"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                        : "bg-neutral-100 text-neutral-500 ring-neutral-200"
                    }`}>
                      {c.status === "active" ? "有効" : c.status === "void" ? "無効" : c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!recentCerts || recentCerts.length === 0) && (
                <tr>
                  <td className="p-8 text-center text-sm text-neutral-500" colSpan={5}>証明書がまだありません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
