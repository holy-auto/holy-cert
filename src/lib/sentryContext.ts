import * as Sentry from "@sentry/nextjs";
import type { Role } from "@/lib/auth/roles";
import type { PlanTier } from "@/lib/billing/planFeatures";

/**
 * Attach the authenticated caller (user + tenant) to the current Sentry scope
 * so any error captured later in the request includes it. Safe to call when
 * Sentry is disabled (no DSN); the SDK no-ops in that case.
 *
 * Email is intentionally omitted because `beforeSend` strips it for PII.
 */
export function setSentryUserAndTenant(args: {
  userId: string;
  tenantId: string;
  role?: Role;
  planTier?: PlanTier;
}): void {
  Sentry.setUser({ id: args.userId });
  Sentry.setTag("tenant_id", args.tenantId);
  if (args.role) Sentry.setTag("role", args.role);
  if (args.planTier) Sentry.setTag("plan_tier", args.planTier);
  Sentry.setContext("tenant", {
    tenant_id: args.tenantId,
    role: args.role ?? null,
    plan_tier: args.planTier ?? null,
  });
}

/** Attach insurer caller context (separate domain from tenant). */
export function setSentryInsurerContext(args: { userId: string; insurerId: string }): void {
  Sentry.setUser({ id: args.userId });
  Sentry.setTag("insurer_id", args.insurerId);
  Sentry.setContext("insurer", { insurer_id: args.insurerId });
}
