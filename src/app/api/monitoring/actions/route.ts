import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiForbidden, apiValidationError, apiInternalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import { runHealthChecks } from "@/lib/observability/healthCheck";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Crons safe to re-run on demand from the monitoring site. Each is
 * read-mostly / idempotent (re-running flushes or re-checks; it never
 * double-charges or double-sends a customer-facing side effect). This
 * allowlist is also the SSRF guard: we only ever fetch our own
 * `${base}/api/cron/<allowlisted>`, never an attacker-supplied path.
 */
const RERUNNABLE_CRONS = new Set(["health-snapshot", "monitor", "stripe-event-monitor", "outbox-flush"]);

function selfBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * POST /api/monitoring/actions   (platform-admin only)
 *
 * The "対策" surface: scoped, manual remediation actions.
 *   { action: "snapshot" }                  → take a health snapshot now
 *   { action: "rerun-cron", cron: "<name>" } → re-trigger an allowlisted cron
 *
 * Deliberately NOT automated: a human in the 監視センター decides when to
 * act. Every action is logged with the caller for an audit trail.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!isPlatformAdmin(caller)) return apiForbidden();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiValidationError("リクエストボディが不正です。");
    }
    const action = (body as { action?: unknown })?.action;
    const log = logger.child({ route: "monitoring.actions", userId: caller.userId });

    if (action === "snapshot") {
      const result = await runHealthChecks();
      const admin = createServiceRoleAdmin("monitoring:manual-snapshot — platform health history, not tenant-scoped");
      const { error } = await admin.from("system_health_snapshots").insert({
        status: result.status,
        latency_ms: result.latency_ms,
        checks: result.checks,
        source: "manual",
      });
      if (error) {
        return apiInternalError(error, "monitoring snapshot insert");
      }
      log.info("manual health snapshot taken", { status: result.status });
      return apiJson({ ok: true, action: "snapshot", status: result.status, latencyMs: result.latency_ms });
    }

    if (action === "rerun-cron") {
      const cron = (body as { cron?: unknown })?.cron;
      if (typeof cron !== "string" || !RERUNNABLE_CRONS.has(cron)) {
        return apiValidationError("再実行できない cron です。", {
          allowed: [...RERUNNABLE_CRONS],
        });
      }
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret) {
        return apiInternalError(new Error("CRON_SECRET not configured"), "monitoring rerun-cron");
      }

      const url = `${selfBaseUrl()}/api/cron/${cron}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${cronSecret}` },
          signal: controller.signal,
          cache: "no-store",
        });
        const text = await res.text();
        log.info("manual cron re-run", { cron, status: res.status });
        return apiJson({
          ok: res.ok,
          action: "rerun-cron",
          cron,
          httpStatus: res.status,
          // First 500 chars only — enough to confirm the run, never a full dump.
          response: text.slice(0, 500),
        });
      } catch (e) {
        const msg =
          e instanceof Error && e.name === "AbortError" ? "cron がタイムアウトしました" : "cron 呼び出しに失敗しました";
        return apiJson({ ok: false, action: "rerun-cron", cron, error: msg }, { status: 502 });
      } finally {
        clearTimeout(timer);
      }
    }

    return apiValidationError("不明なアクションです。", { allowed: ["snapshot", "rerun-cron"] });
  } catch (e) {
    return apiInternalError(e, "POST /api/monitoring/actions");
  }
}
