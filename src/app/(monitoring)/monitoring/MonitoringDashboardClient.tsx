"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types (mirror /api/monitoring/overview) ──
type HealthCheck = { ok: boolean; latency_ms?: number; error?: string };
type Uptime = { total: number; healthy: number; uptimePct: number | null };
type GroupedError = {
  fingerprint: string;
  sample: string;
  level: string;
  source: string;
  count: number;
  lastSeen: string;
  route: string | null;
};
type RecentError = {
  id: string;
  occurredAt: string;
  level: string;
  source: string;
  message: string;
  requestId: string | null;
  route: string | null;
};
type SentryIssue = {
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  count: string;
  userCount: number;
  lastSeen: string;
  permalink: string;
};
type Sentry =
  | { configured: false }
  | { configured: true; ok: true; issues: SentryIssue[] }
  | { configured: true; ok: false; error: string };

type Overview = {
  ok: true;
  timestamp: string;
  health: { status: string; latencyMs: number; checks: Record<string, HealthCheck> };
  uptime: {
    h24: Uptime;
    d7: Uptime;
    d30: Uptime;
    lastDegradedAt: string | null;
    hasHistory: boolean;
  };
  timeline: { at: string; status: string; latencyMs: number | null }[];
  errors: {
    windowHours: number;
    total: number;
    capped: boolean;
    byLevel: Record<string, number>;
    grouped: GroupedError[];
    recent: RecentError[];
  };
  sentry: Sentry;
};

const RERUNNABLE = ["health-snapshot", "monitor", "stripe-event-monitor", "outbox-flush"] as const;

function fmt(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ja-JP", { hour12: false });
}

function statusTone(ok: boolean): string {
  return ok ? "bg-success-dim text-success-text" : "bg-danger-dim text-danger-text";
}

function levelTone(level: string): string {
  if (level === "fatal" || level === "error") return "bg-danger-dim text-danger-text";
  if (level === "warning") return "bg-warning-dim text-warning-text";
  return "bg-surface-hover text-secondary";
}

function uptimeTone(pct: number | null): string {
  if (pct == null) return "text-secondary";
  if (pct >= 99.9) return "text-success-text";
  if (pct >= 99) return "text-warning-text";
  return "text-danger-text";
}

export default function MonitoringDashboardClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [cron, setCron] = useState<(typeof RERUNNABLE)[number]>("health-snapshot");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/monitoring/overview", { cache: "no-store" });
      if (!res.ok) {
        setLoadError(`データ取得に失敗しました (HTTP ${res.status})`);
        return;
      }
      const json = (await res.json()) as Overview;
      setData(json);
      setLoadError(null);
      setUpdatedAt(new Date().toISOString());
    } catch {
      setLoadError("ネットワークエラー: 監視APIに到達できません");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    timer.current = setInterval(() => void load(), 30000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const runAction = useCallback(
    async (payload: Record<string, unknown>, label: string) => {
      setActionBusy(true);
      setActionMsg(null);
      try {
        const res = await fetch("/api/monitoring/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (res.ok && json.ok) {
          setActionMsg(`${label}: 成功`);
        } else {
          setActionMsg(`${label}: 失敗 (${String(json.error ?? json.message ?? res.status)})`);
        }
        await load();
      } catch {
        setActionMsg(`${label}: ネットワークエラー`);
      } finally {
        setActionBusy(false);
      }
    },
    [load],
  );

  if (loading && !data) {
    return <div className="py-20 text-center text-sm text-secondary">読み込み中…</div>;
  }

  const overallOk = data?.health.status === "healthy";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
              overallOk ? "bg-success-dim text-success-text" : "bg-danger-dim text-danger-text"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${overallOk ? "bg-success" : "bg-danger"} ${
                overallOk ? "" : "animate-pulse"
              }`}
            />
            {overallOk ? "システム正常" : "障害検知 / 要対応"}
          </span>
          <span className="text-xs text-secondary">最終更新: {fmt(updatedAt)}（30秒ごと自動更新）</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" data-size="sm" onClick={() => void load()} disabled={loading}>
            再取得
          </button>
          <button
            className="btn-primary"
            data-size="sm"
            disabled={actionBusy}
            onClick={() => void runAction({ action: "snapshot" }, "今すぐ計測")}
          >
            今すぐ計測
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-danger/30 bg-danger-dim px-4 py-3 text-sm text-danger-text">
          {loadError}
        </div>
      )}
      {actionMsg && (
        <div className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-secondary">
          {actionMsg}
        </div>
      )}

      {data && (
        <>
          {/* ── Live checks ── */}
          <section className="glass-card p-5">
            <h2 className="mb-3 text-sm font-semibold">現在のシステムステータス</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(data.health.checks).map(([name, c]) => (
                <div key={name} className="rounded-lg border border-border-default bg-surface p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(c.ok)}`}>
                      {c.ok ? "OK" : "NG"}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-secondary">{c.error ? c.error : `${c.latency_ms ?? 0}ms`}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Uptime ── */}
          <section className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">稼働率</h2>
              <span className="text-[11px] text-secondary">直近の障害: {fmt(data.uptime.lastDegradedAt)}</span>
            </div>
            {!data.uptime.hasHistory ? (
              <p className="text-sm text-secondary">
                稼働率の履歴がまだありません。health-snapshot
                cron（5分間隔）が初回実行されると集計が始まります。「今すぐ計測」で手動記録もできます。
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["24時間", data.uptime.h24],
                    ["7日間", data.uptime.d7],
                    ["30日間", data.uptime.d30],
                  ] as const
                ).map(([label, u]) => (
                  <div key={label} className="rounded-lg border border-border-default bg-surface p-4 text-center">
                    <div className="text-xs text-secondary">{label}</div>
                    <div className={`mt-1 text-2xl font-bold ${uptimeTone(u.uptimePct)}`}>
                      {u.uptimePct == null ? "—" : `${u.uptimePct}%`}
                    </div>
                    <div className="mt-1 text-[10px] text-secondary">
                      {u.healthy}/{u.total} 計測
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.timeline.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-[11px] text-secondary">直近の計測タイムライン（古い → 新しい）</div>
                <div className="flex items-end gap-[2px]">
                  {data.timeline.map((t) => (
                    <div
                      key={t.at}
                      title={`${fmt(t.at)} — ${t.status}${t.latencyMs != null ? ` (${t.latencyMs}ms)` : ""}`}
                      className={`h-6 flex-1 rounded-sm ${t.status === "healthy" ? "bg-success/70" : "bg-danger/80"}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── Errors ── */}
          <section className="glass-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">直近のエラー（24時間）</h2>
              <div className="flex items-center gap-2 text-[11px]">
                {Object.entries(data.errors.byLevel).map(([lvl, n]) => (
                  <span key={lvl} className={`rounded-full px-2 py-0.5 font-semibold ${levelTone(lvl)}`}>
                    {lvl}: {n}
                  </span>
                ))}
                <span className="text-secondary">
                  合計 {data.errors.total}
                  {data.errors.capped ? "+" : ""}
                </span>
              </div>
            </div>

            {data.errors.grouped.length === 0 ? (
              <p className="text-sm text-secondary">24時間以内に記録されたエラーはありません。</p>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-secondary">グループ集計（発生回数順）</div>
                {data.errors.grouped.map((g) => (
                  <div
                    key={g.fingerprint}
                    className="flex items-start gap-3 rounded-lg border border-border-default bg-surface p-3"
                  >
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelTone(g.level)}`}>
                      ×{g.count}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" title={g.sample}>
                        {g.sample}
                      </div>
                      <div className="mt-0.5 text-[11px] text-secondary">
                        {g.source}
                        {g.route ? ` · ${g.route}` : ""} · 最終 {fmt(g.lastSeen)}
                      </div>
                    </div>
                  </div>
                ))}

                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] text-secondary hover:text-primary">
                    直近の個別エラー（最大50件）を表示
                  </summary>
                  <div className="mt-2 space-y-1">
                    {data.errors.recent.map((e) => (
                      <div key={e.id} className="rounded border border-border-default bg-surface px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 font-semibold ${levelTone(e.level)}`}>
                            {e.level}
                          </span>
                          <span className="text-secondary">{fmt(e.occurredAt)}</span>
                          {e.route && <span className="text-secondary">· {e.route}</span>}
                          {e.requestId && <span className="text-secondary">· req:{e.requestId}</span>}
                        </div>
                        <div className="mt-1 break-words">{e.message}</div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </section>

          {/* ── Sentry ── */}
          <section className="glass-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Sentry 未解決 Issue（24時間）</h2>
            {!data.sentry.configured ? (
              <p className="text-sm text-secondary">
                Sentry API 未設定です。<code className="text-xs">SENTRY_ORG</code> /{" "}
                <code className="text-xs">SENTRY_PROJECT</code> / <code className="text-xs">SENTRY_AUTH_TOKEN</code>{" "}
                を設定すると未解決 Issue を表示します。
              </p>
            ) : !data.sentry.ok ? (
              <p className="text-sm text-danger-text">{data.sentry.error}</p>
            ) : data.sentry.issues.length === 0 ? (
              <p className="text-sm text-secondary">未解決 Issue はありません。</p>
            ) : (
              <div className="space-y-2">
                {data.sentry.issues.map((i) => (
                  <a
                    key={i.shortId}
                    href={i.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-lg border border-border-default bg-surface p-3 hover:border-accent/40"
                  >
                    <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelTone(i.level)}`}>
                      {i.count}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{i.title}</div>
                      <div className="mt-0.5 text-[11px] text-secondary">
                        {i.shortId}
                        {i.culprit ? ` · ${i.culprit}` : ""} · {i.userCount} users · 最終 {fmt(i.lastSeen)}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* ── 対策 ── */}
          <section className="glass-card p-5">
            <h2 className="mb-3 text-sm font-semibold">対策アクション</h2>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] text-secondary">cron を再実行</label>
                <select
                  className="mt-1 rounded-md border border-border-default bg-surface px-2 py-1.5 text-sm"
                  value={cron}
                  onChange={(e) => setCron(e.target.value as (typeof RERUNNABLE)[number])}
                >
                  {RERUNNABLE.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn-secondary"
                data-size="sm"
                disabled={actionBusy}
                onClick={() => void runAction({ action: "rerun-cron", cron }, `cron:${cron} 再実行`)}
              >
                再実行
              </button>
              <button
                className="btn-secondary"
                data-size="sm"
                disabled={actionBusy}
                onClick={() => void runAction({ action: "snapshot" }, "ヘルス計測")}
              >
                ヘルス計測
              </button>
            </div>
            <p className="mt-3 text-[11px] text-secondary">
              対応手順は <code className="text-xs">docs/operations-guide.md</code> を参照。エラーの{" "}
              <code className="text-xs">req:</code> ID は x-request-id と一致するため、Vercel ログ / Sentry
              で横断検索できます。
            </p>
          </section>
        </>
      )}
    </div>
  );
}
