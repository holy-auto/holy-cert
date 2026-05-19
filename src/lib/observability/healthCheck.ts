import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { getReadReplica, isReadReplicaConfigured } from "@/lib/supabase/readReplica";

export type HealthCheck = { ok: boolean; latency_ms?: number; error?: string };

export type HealthResult = {
  status: "healthy" | "degraded";
  /** Wall-clock time the whole probe took (sum is misleading; this is the real elapsed). */
  latency_ms: number;
  checks: Record<string, HealthCheck>;
};

/**
 * Probe every critical dependency and return a structured health result.
 *
 * Shared by `GET /api/health` (point-in-time monitoring endpoint) and the
 * `health-snapshot` cron (records the same result into
 * system_health_snapshots so the monitoring site can compute uptime %).
 *
 * Keeping one implementation guarantees the uptime history and the live
 * endpoint can never disagree on what "healthy" means.
 *
 * A read-replica failure is surfaced but does NOT degrade overall health —
 * callers fall back to primary via getReadReplica at runtime.
 */
export async function runHealthChecks(): Promise<HealthResult> {
  const started = Date.now();
  const checks: Record<string, HealthCheck> = {};
  let allHealthy = true;

  // Supabase DB connectivity (primary) — the one check that must pass.
  const dbStart = Date.now();
  try {
    const supabase = createServiceRoleAdmin("health check — probes DB connectivity, not tenant-scoped");
    const { error } = await supabase.from("tenants").select("id").limit(1);
    checks.database = {
      ok: !error,
      latency_ms: Date.now() - dbStart,
      ...(error ? { error: "DB query failed" } : {}),
    };
    if (error) allHealthy = false;
  } catch {
    checks.database = { ok: false, latency_ms: Date.now() - dbStart, error: "DB unreachable" };
    allHealthy = false;
  }

  // Read replica (informational — does not degrade overall health).
  if (isReadReplicaConfigured()) {
    const replicaStart = Date.now();
    try {
      const replica = getReadReplica("health check — replica probe");
      const { error } = await replica.from("tenants").select("id").limit(1);
      checks.database_replica = {
        ok: !error,
        latency_ms: Date.now() - replicaStart,
        ...(error ? { error: "Replica query failed (falling back to primary at runtime)" } : {}),
      };
    } catch {
      checks.database_replica = {
        ok: false,
        latency_ms: Date.now() - replicaStart,
        error: "Replica unreachable (falling back to primary at runtime)",
      };
    }
  }

  // Stripe (config presence only — no outbound API call on the hot path).
  if (!process.env.STRIPE_SECRET_KEY) {
    checks.stripe = { ok: false, error: "Required payment key not configured" };
    allHealthy = false;
  } else {
    checks.stripe = { ok: true, latency_ms: 0 };
  }

  // Required env vars (names only — values are never read or exposed).
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
  ];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.env_vars = {
    ok: missingEnvVars.length === 0,
    ...(missingEnvVars.length > 0 ? { error: `${missingEnvVars.length} required env var(s) missing` } : {}),
  };
  if (missingEnvVars.length > 0) allHealthy = false;

  return {
    status: allHealthy ? "healthy" : "degraded",
    latency_ms: Date.now() - started,
    checks,
  };
}
