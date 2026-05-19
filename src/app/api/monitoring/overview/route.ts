import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api/response";
import { runHealthChecks } from "@/lib/observability/healthCheck";
import { fetchSentryIssues } from "@/lib/observability/sentryIssues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SnapshotRow = { captured_at: string; status: string; latency_ms: number | null };
type ErrorRow = {
  id: string;
  occurred_at: string;
  level: string;
  source: string;
  message: string;
  fingerprint: string | null;
  request_id: string | null;
  route: string | null;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function uptimeFor(snapshots: SnapshotRow[], sinceMs: number, now: number) {
  const since = new Date(now - sinceMs).toISOString();
  const inWindow = snapshots.filter((s) => s.captured_at >= since);
  const total = inWindow.length;
  if (total === 0) return { total: 0, healthy: 0, uptimePct: null as number | null };
  const healthy = inWindow.filter((s) => s.status === "healthy").length;
  return { total, healthy, uptimePct: Math.round((healthy / total) * 10000) / 100 };
}

/**
 * GET /api/monitoring/overview
 *
 * Single aggregate powering the 監視センター. Platform-admin only — it
 * exposes cross-tenant health, error messages and Sentry links, which is
 * strictly 運営 data. The monitoring site is a separate shell but is NOT
 * unauthenticated; "independent site" is about UX/URL, not security.
 *
 * All sub-queries run under Promise.allSettled so one slow/failing source
 * (e.g. Sentry) degrades that panel only, never the whole dashboard.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!isPlatformAdmin(caller)) return apiForbidden();

    const admin = createServiceRoleAdmin(
      "monitoring:overview — reads platform-global health/error tables, not tenant-scoped",
    );
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * DAY).toISOString();
    const errorsSince = new Date(now - DAY).toISOString();

    const [liveHealth, snapshotsRes, errorsRes, sentry] = await Promise.allSettled([
      runHealthChecks(),
      // 30d of snapshots powers every uptime window + the timeline strip.
      // ~8.6k rows max (5-min cadence); two thin columns, bounded.
      admin
        .from("system_health_snapshots")
        .select("captured_at, status, latency_ms")
        .gte("captured_at", thirtyDaysAgo)
        .order("captured_at", { ascending: false })
        .limit(10000),
      admin
        .from("error_events")
        .select("id, occurred_at, level, source, message, fingerprint, request_id, route")
        .order("occurred_at", { ascending: false })
        .limit(200),
      fetchSentryIssues(10),
    ]);

    // ── Live health ──
    const health =
      liveHealth.status === "fulfilled" ? liveHealth.value : { status: "degraded" as const, latency_ms: 0, checks: {} };

    // ── Uptime ──
    const snapshots: SnapshotRow[] =
      snapshotsRes.status === "fulfilled" ? ((snapshotsRes.value.data as SnapshotRow[] | null) ?? []) : [];

    const uptime = {
      h24: uptimeFor(snapshots, DAY, now),
      d7: uptimeFor(snapshots, 7 * DAY, now),
      d30: uptimeFor(snapshots, 30 * DAY, now),
    };

    const lastDegraded = snapshots.find((s) => s.status !== "healthy")?.captured_at ?? null;

    // Timeline: most-recent 96 samples (~8h at 5-min cadence), oldest→newest.
    const timeline = snapshots
      .slice(0, 96)
      .map((s) => ({ at: s.captured_at, status: s.status, latencyMs: s.latency_ms }))
      .reverse();

    // ── Errors ──
    const errors: ErrorRow[] =
      errorsRes.status === "fulfilled" ? ((errorsRes.value.data as ErrorRow[] | null) ?? []) : [];
    const recentWindow = errors.filter((e) => e.occurred_at >= errorsSince);

    const byLevel: Record<string, number> = {};
    for (const e of recentWindow) byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;

    // Group repeats by fingerprint so the UI can show "× N".
    const groupMap = new Map<
      string,
      {
        fingerprint: string;
        sample: string;
        level: string;
        source: string;
        count: number;
        lastSeen: string;
        route: string | null;
      }
    >();
    for (const e of recentWindow) {
      const key = e.fingerprint ?? e.message;
      const existing = groupMap.get(key);
      if (existing) {
        existing.count += 1;
        if (e.occurred_at > existing.lastSeen) existing.lastSeen = e.occurred_at;
      } else {
        groupMap.set(key, {
          fingerprint: key,
          sample: e.message,
          level: e.level,
          source: e.source,
          count: 1,
          lastSeen: e.occurred_at,
          route: e.route,
        });
      }
    }
    const grouped = [...groupMap.values()].sort((a, b) => b.count - a.count).slice(0, 25);

    return apiJson({
      ok: true,
      timestamp: new Date().toISOString(),
      health: {
        status: health.status,
        latencyMs: health.latency_ms,
        checks: health.checks,
      },
      uptime: {
        ...uptime,
        lastDegradedAt: lastDegraded,
        hasHistory: snapshots.length > 0,
      },
      timeline,
      errors: {
        windowHours: 24,
        total: recentWindow.length,
        capped: errors.length >= 200,
        byLevel,
        grouped,
        recent: errors.slice(0, 50).map((e) => ({
          id: e.id,
          occurredAt: e.occurred_at,
          level: e.level,
          source: e.source,
          message: e.message,
          requestId: e.request_id,
          route: e.route,
        })),
      },
      sentry: sentry.status === "fulfilled" ? sentry.value : { configured: false },
    });
  } catch (e) {
    return apiInternalError(e, "GET /api/monitoring/overview");
  }
}
