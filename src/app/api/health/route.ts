import { runHealthChecks } from "@/lib/observability/healthCheck";
import { apiJson } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health
 * Comprehensive health check for monitoring.
 * Returns 200 if all critical services are reachable, 503 otherwise.
 *
 * Probe logic lives in @/lib/observability/healthCheck so the
 * health-snapshot cron records the exact same result for uptime history.
 */
export async function GET() {
  const { status, checks } = await runHealthChecks();
  return apiJson(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: status === "healthy" ? 200 : 503 },
  );
}
