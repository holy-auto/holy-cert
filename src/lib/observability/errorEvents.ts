import { createServiceRoleAdmin } from "@/lib/supabase/admin";

export type ErrorEventLevel = "fatal" | "error" | "warning";
export type ErrorEventSource = "api" | "cron" | "client" | "webhook" | "job";

export type RecordErrorEventInput = {
  level?: ErrorEventLevel;
  source?: ErrorEventSource;
  message: string;
  requestId?: string | null;
  route?: string | null;
  tenantId?: string | null;
  context?: Record<string, unknown>;
};

/**
 * Collapse a message into a stable grouping key so the monitoring UI can
 * show "same error × N" instead of N near-identical rows. We strip the
 * high-cardinality bits (uuids, hex ids, long digit runs, quoted literals)
 * that differ per occurrence but not per bug.
 */
function fingerprint(message: string): string {
  return message
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<uuid>")
    .replace(/0x[0-9a-f]+/g, "<hex>")
    .replace(/\b\d{3,}\b/g, "<n>")
    .replace(/'[^']*'/g, "<str>")
    .replace(/"[^"]*"/g, "<str>")
    .slice(0, 300);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Record an error into the platform error_events log (powers the
 * monitoring site's recent-errors feed).
 *
 * Fire-and-forget by contract: this never throws and never blocks the
 * caller — it mirrors the lazy Sentry capture pattern used across the
 * codebase. It is wired into the two central error funnels
 * (apiInternalError + sendCronFailureAlert), so individual routes do not
 * call it directly.
 *
 * Intentionally swallows its own failures: if the DB is the thing that's
 * down, the health snapshot + Sentry already capture that; retrying here
 * would just amplify load during an incident.
 */
export function recordErrorEvent(input: RecordErrorEventInput): void {
  void (async () => {
    try {
      const message = (input.message ?? "").toString().slice(0, 2000);
      if (!message) return;

      const tenantId = input.tenantId && UUID_RE.test(input.tenantId) ? input.tenantId : null;

      const admin = createServiceRoleAdmin("observability:recordErrorEvent — platform error log, not tenant-scoped");
      await admin.from("error_events").insert({
        level: input.level ?? "error",
        source: input.source ?? "api",
        message,
        fingerprint: fingerprint(message),
        request_id: input.requestId ?? null,
        route: input.route ?? null,
        tenant_id: tenantId,
        context: input.context ?? {},
      });
    } catch {
      // Deliberate no-op — see doc comment.
    }
  })();
}
