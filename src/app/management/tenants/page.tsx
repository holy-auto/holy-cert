import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  const supabase = createAdminClient();

  let query = supabase
    .from("tenants")
    .select("id, name, plan_tier, is_active, created_at, stripe_subscription_id")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: tenants, error } = await query.limit(100);

  if (error) {
    return <p className="text-sm text-red-700">読み込みエラー: {error.message}</p>;
  }

  // Get certificate counts per tenant
  const tenantIds = (tenants ?? []).map((t) => t.id);
  const certCounts = new Map<string, number>();

  if (tenantIds.length > 0) {
    const { data: certs } = await supabase
      .from("certificates")
      .select("tenant_id")
      .in("tenant_id", tenantIds);

    for (const c of certs ?? []) {
      certCounts.set(c.tenant_id, (certCounts.get(c.tenant_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
          TENANTS
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">テナント一覧</h1>
        <p className="text-sm text-neutral-600">登録テナントの管理・状態確認</p>
      </div>

      {/* Search */}
      <form className="flex gap-2" action="/management/tenants" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="テナント名で検索"
          className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
        <button
          type="submit"
          className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          検索
        </button>
        {q ? (
          <a
            href="/management/tenants"
            className="rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            クリア
          </a>
        ) : null}
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-neutral-50">
            <tr>
              <th className="p-3 text-left font-semibold text-neutral-600">テナント名</th>
              <th className="p-3 text-left font-semibold text-neutral-600">プラン</th>
              <th className="p-3 text-left font-semibold text-neutral-600">状態</th>
              <th className="p-3 text-left font-semibold text-neutral-600">証明書数</th>
              <th className="p-3 text-left font-semibold text-neutral-600">登録日</th>
              <th className="p-3 text-left font-semibold text-neutral-600">Stripe</th>
            </tr>
          </thead>
          <tbody>
            {(tenants ?? []).map((t) => (
              <tr key={t.id} className="border-t hover:bg-neutral-50">
                <td className="p-3 font-medium text-neutral-900">{t.name ?? t.id}</td>
                <td className="p-3">
                  <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 ring-1 ring-neutral-200 uppercase">
                    {t.plan_tier ?? "mini"}
                  </span>
                </td>
                <td className="p-3">
                  {t.is_active ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="p-3 text-neutral-700">{certCounts.get(t.id) ?? 0}</td>
                <td className="p-3 whitespace-nowrap text-neutral-600">
                  {new Date(t.created_at).toLocaleDateString("ja-JP")}
                </td>
                <td className="p-3 font-mono text-xs text-neutral-500">
                  {t.stripe_subscription_id ? "連携済" : "-"}
                </td>
              </tr>
            ))}
            {(!tenants || tenants.length === 0) && (
              <tr>
                <td className="p-8 text-center text-sm text-neutral-500" colSpan={6}>
                  {q ? `「${q}」に一致するテナントが見つかりません。` : "テナントがまだ登録されていません。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-400">
        最大100件表示。
      </p>
    </div>
  );
}
