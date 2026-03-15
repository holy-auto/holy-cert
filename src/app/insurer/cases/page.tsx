import Link from "next/link";
import { headers } from "next/headers";
import { formatDateTime } from "@/lib/format";
import { CaseStatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const CASE_TYPE_LABELS: Record<string, string> = {
  accident: "事故入庫",
  vehicle_insurance: "車両保険",
  rework_check: "再施工確認",
  damage_check: "損傷確認",
  other: "その他",
};

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

async function fetchCases(sp: Record<string, string | string[] | undefined>) {
  const { baseUrl, cookie } = await getRequestInfo();
  const qs = new URLSearchParams();

  const status = first(sp.status).trim();
  const caseType = first(sp.case_type).trim();
  if (status) qs.set("status", status);
  if (caseType) qs.set("case_type", caseType);

  const url = `${baseUrl}/api/insurance-cases${qs.toString() ? `?${qs.toString()}` : ""}`;
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

export default async function InsurerCasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const status = first(sp.status).trim();
  const caseType = first(sp.case_type).trim();

  const result = await fetchCases(sp);
  const rows = result.rows;

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
                案件管理
              </h1>
              <p className="mt-2 text-sm text-neutral-600">
                保険案件の一覧と進捗管理
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
            <Link
              href="/insurer/search"
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              証明書検索
            </Link>
          </div>
        </header>

        {/* Filters */}
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-3">
            <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">FILTER</div>
            <div className="mt-1 text-base font-semibold text-neutral-900">案件を絞り込み</div>
          </div>
          <form action="/insurer/cases" method="get" className="flex flex-wrap gap-3">
            <select
              name="status"
              defaultValue={status}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="">全ステータス</option>
              <option value="submitted">提出済み</option>
              <option value="under_review">確認中</option>
              <option value="info_requested">情報依頼</option>
              <option value="approved">承認</option>
              <option value="rejected">却下</option>
              <option value="closed">完了</option>
              <option value="cancelled">キャンセル</option>
            </select>
            <select
              name="case_type"
              defaultValue={caseType}
              className="rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
            >
              <option value="">全種別</option>
              <option value="accident">事故入庫</option>
              <option value="vehicle_insurance">車両保険</option>
              <option value="rework_check">再施工確認</option>
              <option value="damage_check">損傷確認</option>
              <option value="other">その他</option>
            </select>
            <button type="submit" className="btn-primary px-4 py-2.5">
              絞り込み
            </button>
          </form>
        </section>

        {/* Error */}
        {!result.ok && (
          <section className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm">
            <div className="text-lg font-semibold text-red-700">APIエラー</div>
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
              <div className="text-xs font-semibold tracking-[0.18em] text-neutral-500">CASES</div>
              <div className="mt-1 text-base font-semibold text-neutral-900">案件一覧</div>
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
                  <th className="p-3 text-left font-semibold text-neutral-600">案件番号</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">タイトル</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">種別</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">施工店</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">車両</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">ステータス</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">更新日</th>
                  <th className="p-3 text-left font-semibold text-neutral-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} className="border-t hover:bg-neutral-50">
                    <td className="p-3 font-mono text-xs text-neutral-700">{row.case_number}</td>
                    <td className="p-3 font-medium text-neutral-900">{row.title}</td>
                    <td className="p-3 text-neutral-600">{CASE_TYPE_LABELS[row.case_type] ?? row.case_type}</td>
                    <td className="p-3 text-neutral-600">{row.tenant_name || "-"}</td>
                    <td className="p-3 text-neutral-600">{row.vehicle_summary || "-"}</td>
                    <td className="p-3">
                      <CaseStatusBadge status={row.status} />
                    </td>
                    <td className="p-3 whitespace-nowrap text-neutral-600">
                      {formatDateTime(row.updated_at)}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/insurer/cases/${row.id}`}
                        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-sm text-neutral-500">
                      案件がありません。
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
