import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ManagementBillingPage() {
  const supabase = createAdminClient();

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, plan_tier, is_active, stripe_subscription_id, stripe_customer_id, created_at")
    .order("created_at", { ascending: false });

  const allTenants = tenants ?? [];

  // Plan distribution
  const planDist: Record<string, number> = { mini: 0, standard: 0, pro: 0 };
  for (const t of allTenants) {
    const tier = String(t.plan_tier ?? "mini");
    planDist[tier] = (planDist[tier] ?? 0) + 1;
  }

  const activePaid = allTenants.filter((t) => t.is_active && t.stripe_subscription_id);
  const inactiveTenants = allTenants.filter((t) => !t.is_active);
  const noSubscription = allTenants.filter((t) => !t.stripe_subscription_id);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
          BILLING OVERVIEW
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">課金状況</h1>
        <p className="text-sm text-neutral-600">全テナントの課金・プラン状況の概要</p>
      </div>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">TOTAL</div>
          <div className="mt-2 text-2xl font-bold text-neutral-900">{allTenants.length}</div>
          <div className="mt-1 text-xs text-neutral-500">テナント総数</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">ACTIVE PAID</div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{activePaid.length}</div>
          <div className="mt-1 text-xs text-neutral-500">有料アクティブ</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">INACTIVE</div>
          <div className="mt-2 text-2xl font-bold text-amber-600">{inactiveTenants.length}</div>
          <div className="mt-1 text-xs text-neutral-500">停止中</div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">NO SUBSCRIPTION</div>
          <div className="mt-2 text-2xl font-bold text-neutral-400">{noSubscription.length}</div>
          <div className="mt-1 text-xs text-neutral-500">未契約</div>
        </div>
      </section>

      {/* Plan distribution */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500">プラン別分布</h2>
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

      {/* Inactive tenants list */}
      {inactiveTenants.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-neutral-500">支払い停止中テナント</h2>
          <div className="rounded-2xl border border-amber-200 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-amber-800">テナント名</th>
                  <th className="p-3 text-left font-semibold text-amber-800">プラン</th>
                  <th className="p-3 text-left font-semibold text-amber-800">登録日</th>
                  <th className="p-3 text-left font-semibold text-amber-800">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {inactiveTenants.map((t) => (
                  <tr key={t.id} className="border-t border-amber-100 hover:bg-amber-50/50">
                    <td className="p-3 font-medium text-neutral-900">{t.name ?? t.id}</td>
                    <td className="p-3">
                      <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200 uppercase">
                        {t.plan_tier ?? "mini"}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap text-neutral-600">
                      {new Date(t.created_at).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="p-3 font-mono text-xs text-neutral-500">
                      {t.stripe_subscription_id ? "連携済" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
