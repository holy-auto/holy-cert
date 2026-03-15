import Link from "next/link";
import { headers } from "next/headers";
import { formatDateTime } from "@/lib/format";
import { CertificateStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

async function getRequestInfo() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const cookie = h.get("cookie") ?? "";
  return { baseUrl: `${proto}://${host}`, cookie };
}

async function fetchSearch(sp: Record<string, string | string[] | undefined>) {
  const { baseUrl, cookie } = await getRequestInfo();
  const qs = new URLSearchParams();

  for (const key of ["q", "status", "date_from", "date_to"] as const) {
    const value = first(sp[key]).trim();
    if (value) qs.set(key, value);
  }

  const url = `${baseUrl}/api/insurer/search${qs.toString() ? `?${qs.toString()}` : ""}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });

  let json: any = {};
  try {
    json = await res.json();
  } catch {
    json = { error: "invalid_json" };
  }

  return {
    ok: res.ok,
    status: res.status,
    rows: (Array.isArray(json?.rows) ? json.rows : []) as any[],
    raw: json,
  };
}

export default async function InsurerSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const status = first(sp.status).trim();
  const dateFrom = first(sp.date_from).trim();
  const dateTo = first(sp.date_to).trim();

  const result = await fetchSearch(sp);
  const rows = result.rows;

  const exportQs = new URLSearchParams();
  if (q) exportQs.set("q", q);
  if (status) exportQs.set("status", status);
  if (dateFrom) exportQs.set("date_from", dateFrom);
  if (dateTo) exportQs.set("date_to", dateTo);
  const exportUrl = `/api/insurer/export${exportQs.toString() ? `?${exportQs.toString()}` : ""}`;

  return (
    <main className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-neutral-600">
              INSURER PORTAL
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
                証明書検索
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                施工証明書を public_id・顧客名・車両で検索します。
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <Link
              href="/insurer"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              ダッシュボード
            </Link>
          </div>
        </header>

        {/* Search Form */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">SEARCH</div>
            <div className="mt-1 text-base font-semibold text-neutral-900">証明書を検索</div>
          </div>
          <form action="/insurer/search" method="get" className="space-y-3">
            <div className="flex gap-3">
              <input
                name="q"
                defaultValue={q}
                placeholder="public_id / 顧客名 / 車両型式 / ナンバー / 施工店名"
                className="flex-1 rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
              <button type="submit" className="btn-primary px-4 py-2.5">
                検索
              </button>
              <a
                href={exportUrl}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                CSV
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <select
                name="status"
                defaultValue={status}
                className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
              >
                <option value="">全ステータス</option>
                <option value="active">有効 (active)</option>
                <option value="void">無効 (void)</option>
                <option value="expired">期限切れ (expired)</option>
              </select>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">FROM</span>
                <input
                  type="date"
                  name="date_from"
                  defaultValue={dateFrom}
                  className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 whitespace-nowrap">TO</span>
                <input
                  type="date"
                  name="date_to"
                  defaultValue={dateTo}
                  className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>
            </div>
          </form>
        </section>

        {/* Error */}
        {!result.ok && (
          <section className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm">
            <div className="text-lg font-semibold text-red-700">検索APIエラー</div>
            <div className="mt-2 text-sm text-red-700">HTTP {result.status}</div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-red-100 p-4 text-xs text-red-900">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          </section>
        )}

        {/* Results */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">RESULTS</div>
              <div className="mt-1 text-base font-semibold text-neutral-900">検索結果</div>
            </div>
            {rows.length > 0 && (
              <div className="text-sm text-neutral-500">
                <span className="font-semibold text-neutral-900">{rows.length}</span> 件
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="p-3 text-left font-semibold text-neutral-600">証明書 ID</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">顧客名</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">車両</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">施工店</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">ステータス</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">作成日時</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, idx: number) => {
                  const publicId = row.public_id ?? "";
                  const vehicleModel = row.vehicle_model ?? row.vehicle_info_json?.model ?? "";
                  const vehiclePlate = row.vehicle_plate ?? row.vehicle_info_json?.plate ?? row.vehicle_info_json?.plate_display ?? "";

                  return (
                    <tr key={`${publicId}_${idx}`} className="border-t hover:bg-neutral-50">
                      <td className="p-3 font-mono text-xs text-neutral-700">{publicId || "-"}</td>
                      <td className="p-3 font-medium text-neutral-900">{row.customer_name || "-"}</td>
                      <td className="p-3 text-neutral-600">
                        {[vehicleModel, vehiclePlate].filter(Boolean).join(" / ") || "-"}
                      </td>
                      <td className="p-3 text-neutral-600">{row.tenant_name || "-"}</td>
                      <td className="p-3">
                        <CertificateStatusBadge status={row.status ?? ""} />
                      </td>
                      <td className="p-3 whitespace-nowrap text-neutral-600">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="p-3">
                        {publicId ? (
                          <div className="flex gap-2">
                            <a
                              href={`/insurer/c/${encodeURIComponent(publicId)}`}
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                              詳細
                            </a>
                            <a
                              href={`/c/${encodeURIComponent(publicId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                            >
                              公開
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-500">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm text-neutral-500">
                      {q ? `「${q}」に一致する証明書が見つかりません。` : "検索キーワードを入力して検索してください。"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
