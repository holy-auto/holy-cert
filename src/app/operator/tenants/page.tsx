import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function OperatorTenantsPage() {
  const admin = createSupabaseAdminClient();

  const { data: tenants, error } = await admin
    .from("tenants")
    .select("id,name,plan_tier,created_at")
    .order("created_at", { ascending: false });

  // Fetch member counts per tenant
  const tenantIds = (tenants ?? []).map((t: any) => t.id);
  const { data: memberships } = await admin
    .from("tenant_memberships")
    .select("tenant_id")
    .in("tenant_id", tenantIds.length > 0 ? tenantIds : ["__none__"]);

  const memberCounts: Record<string, number> = {};
  for (const m of memberships ?? []) {
    memberCounts[m.tenant_id] = (memberCounts[m.tenant_id] ?? 0) + 1;
  }

  // Fetch cert counts
  const { data: certs } = await admin
    .from("certificates")
    .select("tenant_id")
    .in("tenant_id", tenantIds.length > 0 ? tenantIds : ["__none__"]);

  const certCounts: Record<string, number> = {};
  for (const c of certs ?? []) {
    certCounts[(c as any).tenant_id] = (certCounts[(c as any).tenant_id] ?? 0) + 1;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        tag="運営"
        title="テナント管理"
        description="登録されている全テナントの一覧と状況を確認します。"
      />

      <div className="text-sm text-muted">{(tenants ?? []).length} テナント</div>

      {error && <div className="glass-card p-4 text-sm text-red-500">{error.message}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(tenants ?? []).map((t: any) => (
          <div key={t.id} className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-primary truncate">{t.name || "未設定"}</div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[rgba(0,113,227,0.08)] text-[#0071e3] uppercase">
                {t.plan_tier ?? "free"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted">メンバー</span>
                <div className="font-semibold text-primary">{memberCounts[t.id] ?? 0}</div>
              </div>
              <div>
                <span className="text-muted">証明書</span>
                <div className="font-semibold text-primary">{certCounts[t.id] ?? 0}</div>
              </div>
            </div>
            <div className="text-[10px] text-muted">
              作成: {new Date(t.created_at).toLocaleDateString("ja-JP")}
            </div>
            <div className="text-[10px] font-mono text-muted break-all">{t.id}</div>
          </div>
        ))}
      </div>

      {(tenants ?? []).length === 0 && (
        <div className="glass-card p-8 text-center text-muted">テナントがありません</div>
      )}
    </div>
  );
}
