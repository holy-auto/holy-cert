import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import PageHeader from "@/components/ui/PageHeader";
import { getRoiBoardSnapshot, type FeatureSummary } from "@/lib/operations/roiBoard";

export const dynamic = "force-dynamic";

const FLAG_META: Record<FeatureSummary["flag"], { label: string; tone: string }> = {
  freeze_candidate: { label: "凍結候補", tone: "bg-red-500/10 border-red-400/30 text-red-400" },
  watch: { label: "要観察", tone: "bg-amber-500/10 border-amber-400/30 text-amber-400" },
  healthy: { label: "健全", tone: "bg-emerald-500/10 border-emerald-400/30 text-emerald-400" },
};

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatJpy(value: number): string {
  if (value === 0) return "—";
  return `¥${value.toLocaleString("ja-JP")}`;
}

export default async function FeatureRoiBoardPage() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveCallerWithRole(supabase);
  if (!caller) redirect("/login?next=/admin/platform/operations/roi-board");
  if (!isPlatformAdmin(caller)) redirect("/admin");

  const snapshot = await getRoiBoardSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        tag="運営専用"
        title="機能 ROI ボード"
        description={
          snapshot.latest_week
            ? `${snapshot.earliest_week} 〜 ${snapshot.latest_week} (${snapshot.features.length} 機能 / 直近 ${snapshot.features[0]?.weekly.length ?? 0} 週)`
            : "まだメトリクスが収集されていません。cron `feature-metrics-rollup` が走るのを待つか、Supabase Studio で生データを確認してください。"
        }
        actions={
          <div className="flex gap-2">
            <Link href="/admin/platform/operations" className="btn-secondary text-sm">
              運営ダッシュボード
            </Link>
            <a href="/api/admin/roi-board/export" className="btn-primary text-sm" download>
              CSV ダウンロード
            </a>
          </div>
        }
      />

      {snapshot.features.length === 0 ? (
        <div className="glass-card p-8 text-center text-sm text-muted">
          <div className="mb-2 text-base font-semibold text-primary">データなし</div>
          <p>
            `feature_metrics_weekly` テーブルが空です。cron が走ってから再度アクセスしてください。
            <br />
            手動実行: <code className="font-mono">POST /api/cron/feature-metrics-rollup</code>
          </p>
        </div>
      ) : (
        <section className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-base">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Success
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Failure
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Success Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Tenants
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    ARR (window)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                    Weekly trend
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted">
                    Flag
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {snapshot.features.map((f) => {
                  const flag = FLAG_META[f.flag];
                  return (
                    <tr key={f.feature_id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3 font-mono text-xs text-primary">{f.feature_id}</td>
                      <td className="px-4 py-3 text-right font-mono">{f.success_total.toLocaleString("ja-JP")}</td>
                      <td className="px-4 py-3 text-right font-mono text-muted">
                        {f.failure_total.toLocaleString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatPercent(f.success_rate)}</td>
                      <td className="px-4 py-3 text-right font-mono">
                        {f.tenants_using}
                        <span className="text-muted">/{snapshot.total_tenants_active}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-muted">{formatJpy(f.arr_jpy_total)}</td>
                      <td className="px-4 py-3">
                        <Sparkline values={f.weekly.map((w) => w.success)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${flag.tone}`}
                        >
                          {flag.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="rounded-xl border border-border-default bg-base p-4 text-xs text-muted">
        <div className="font-semibold text-primary">読み方</div>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            <strong>Success Rate</strong> = success / (success + failure)。reach が 0 の機能は「—」表示。
          </li>
          <li>
            <strong>Tenants</strong> = ウィンドウ内で 1 回以上 success したテナント数 / 全アクティブテナント数。
          </li>
          <li>
            <strong>ARR (window)</strong> は Phase 3 で埋まる予定の値。現状は cron が常に 0 を書き込むため「—」表示。
          </li>
          <li>
            <strong>凍結候補</strong> = テナントカバレッジ &lt; 5% かつ success_total &lt; 30。
            <strong>要観察</strong> = success rate &lt; 70% かつ reach &gt;= 10。
          </li>
          <li>
            参照ドキュメント: <code className="font-mono">docs/feature-roi-board.md</code>
            (§6「捨てる」判断のルール)
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Tiny inline sparkline. Pure SVG, no client component needed. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return <span className="text-xs text-muted">no data</span>;
  const max = Math.max(...values, 1);
  const width = 100;
  const height = 28;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * step;
      const y = height - (v / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} className="text-emerald-400" aria-label={`weekly success: ${values.join(", ")}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
