import { NextRequest } from "next/server";
import { apiJson, apiUnauthorized } from "@/lib/api/response";
import { verifyCronRequest } from "@/lib/cronAuth";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { runHealthChecks } from "@/lib/observability/healthCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health Snapshot Cron (every ~5 min, see vercel.json)
 *
 * Records one system_health_snapshots row per run. This is the data the
 * monitoring site uses to compute uptime % over 24h / 7d / 30d windows —
 * /api/health alone is point-in-time and keeps no history.
 *
 * Snapshot recording must never fail the cron silently in a way that
 * looks like "healthy" — if the insert fails we still return the probe
 * result with a recorded:false flag so a missing-history gap is visible.
 */
export async function GET(req: NextRequest) {
  const { authorized, error: authError } = verifyCronRequest(req);
  if (!authorized) {
    return apiUnauthorized(authError);
  }

  const result = await runHealthChecks();
  let recorded = false;

  try {
    const admin = createServiceRoleAdmin("cron:health-snapshot — records platform uptime history, not tenant-scoped");
    const { error } = await admin.from("system_health_snapshots").insert({
      status: result.status,
      latency_ms: result.latency_ms,
      checks: result.checks,
      source: "cron",
    });
    recorded = !error;
    if (error) {
      console.error("[cron/health-snapshot] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[cron/health-snapshot] insert threw:", e instanceof Error ? e.message : String(e));
  }

  return apiJson({
    ok: true,
    status: result.status,
    recorded,
    latency_ms: result.latency_ms,
    timestamp: new Date().toISOString(),
  });
}
