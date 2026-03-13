import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = { q?: string; page?: string };

export default async function ManagementCertificatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const currentPage = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  let query = supabase
    .from("certificates")
    .select("public_id, customer_name, status, created_at, tenant_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) {
    query = query.or(`public_id.ilike.%${q}%,customer_name.ilike.%${q}%`);
  }

  const { data: rows, error, count: totalCount } = await query;

  if (error) {
    return <p className="text-sm text-red-700">読み込みエラー: {error.message}</p>;
  }

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Get tenant names
  const tenantIds = [...new Set((rows ?? []).map((r) => r.tenant_id))];
  const { data: tenantNames } = tenantIds.length > 0
    ? await supabase.from("tenants").select("id, name").in("id", tenantIds)
    : { data: [] };
  const tenantMap = new Map((tenantNames ?? []).map((t) => [t.id, t.name]));

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return `/management/certificates${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
          ALL CERTIFICATES
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">証明書検索（全テナント）</h1>
        <p className="text-sm text-neutral-600">
          全{total}件中 {total > 0 ? `${offset + 1}〜${Math.min(offset + PAGE_SIZE, total)}` : "0"}件表示
        </p>
      </div>

      {/* Search */}
      <form className="flex gap-2" action="/management/certificates" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="証明書ID / 顧客名で検索"
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
            href="/management/certificates"
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
              <th className="p-3 text-left font-semibold text-neutral-600">作成日時</th>
              <th className="p-3 text-left font-semibold text-neutral-600">テナント</th>
              <th className="p-3 text-left font-semibold text-neutral-600">証明書 ID</th>
              <th className="p-3 text-left font-semibold text-neutral-600">顧客名</th>
              <th className="p-3 text-left font-semibold text-neutral-600">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.public_id} className={`border-t hover:bg-neutral-50 ${r.status === "void" ? "opacity-60" : ""}`}>
                <td className="p-3 whitespace-nowrap text-neutral-600">
                  {new Date(r.created_at).toLocaleString("ja-JP")}
                </td>
                <td className="p-3 text-neutral-700">{tenantMap.get(r.tenant_id) ?? r.tenant_id}</td>
                <td className="p-3 font-mono text-xs text-neutral-700">{r.public_id}</td>
                <td className="p-3 font-medium text-neutral-900">{r.customer_name}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                    r.status === "active"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-neutral-100 text-neutral-500 ring-neutral-200"
                  }`}>
                    {r.status === "active" ? "有効" : r.status === "void" ? "無効" : r.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td className="p-8 text-center text-sm text-neutral-500" colSpan={5}>
                  {q ? `「${q}」に一致する証明書が見つかりません。` : "証明書がまだ発行されていません。"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2">
          {currentPage > 1 ? (
            <a
              href={pageHref(currentPage - 1)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              前へ
            </a>
          ) : (
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-400">
              前へ
            </span>
          )}
          <span className="px-3 text-sm text-neutral-600">
            {currentPage} / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <a
              href={pageHref(currentPage + 1)}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              次へ
            </a>
          ) : (
            <span className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-400">
              次へ
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
