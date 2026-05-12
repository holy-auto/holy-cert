/**
 * GET /api/cron/feature-metrics-rollup
 *
 * Compute the previous ISO week's `feature_metrics_weekly` rows for the
 * initial 6 features defined in docs/feature-roi-board.md. Runs Monday
 * 04:00 JST; idempotent on (feature_id, tenant_id, week_start) so a
 * re-run safely overwrites prior values.
 *
 * Phase 1 scope: success / failure counts only (drives ROI rough cut).
 * dau / wau / arr_jpy / support_load are populated by future phases —
 * they default to 0 and the UI displays "—" rather than mislead.
 *
 * Schedule: Mon 04:00 JST (= Sun 19:00 UTC). Lock 30 min to absorb
 * slow tenants without blocking the next run.
 */

import type { NextRequest } from "next/server";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiOk, apiUnauthorized, apiInternalError } from "@/lib/api/response";
import { verifyCronRequest } from "@/lib/cronAuth";
import { sendCronFailureAlert } from "@/lib/cronAlert";
import { withCronLock } from "@/lib/cron/lock";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Features rolled up in Phase 1. The full set lives in
// docs/feature-roi-board.md §2; the rest land as their underlying
// queries get built (academy, passport, etc).
const FEATURES = [
  "cert.issue",
  "pos",
  "customer.portal",
  "reservations",
  "insurer.case_view",
  "anchoring.polygon",
] as const;
type FeatureId = (typeof FEATURES)[number];

interface TenantCount {
  tenant_id: string;
  success: number;
  failure: number;
}

/**
 * Return the (Monday, Sunday) range of the PREVIOUS ISO week, in UTC.
 * Running Monday 04:00 JST = Sunday 19:00 UTC: at that moment the
 * previous full ISO week (Mon→Sun) just ended.
 */
function previousIsoWeekRange(now = new Date()): { start: Date; end: Date; weekStartDate: string } {
  // Move to UTC midnight of "now".
  const u = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // ISO weekday: Mon=1..Sun=7. UTC getDay: Sun=0..Sat=6.
  const isoDow = u.getUTCDay() === 0 ? 7 : u.getUTCDay();
  // Subtract days back to THIS week's Monday, then go back 7 more days for previous.
  const thisMonday = new Date(u);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - (isoDow - 1));
  const prevMonday = new Date(thisMonday);
  prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
  const prevSundayEnd = new Date(thisMonday);
  prevSundayEnd.setUTCMilliseconds(prevSundayEnd.getUTCMilliseconds() - 1);
  return {
    start: prevMonday,
    end: prevSundayEnd,
    weekStartDate: prevMonday.toISOString().slice(0, 10),
  };
}

/**
 * Run a single per-feature aggregation. The strategy varies per feature:
 * we COUNT() the underlying success/failure events grouped by tenant_id
 * over the week range. Each query is wrapped in try/catch so one bad
 * feature does not block the others.
 */
async function aggregateFeature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  feature: FeatureId,
  start: Date,
  end: Date,
): Promise<TenantCount[]> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  try {
    switch (feature) {
      case "cert.issue": {
        const { data } = await admin
          .from("certificates")
          .select("tenant_id, status")
          .gte("created_at", startIso)
          .lte("created_at", endIso);
        return tallyByTenant((data ?? []) as { tenant_id: string; status: string | null }[], (r) => ({
          isSuccess: r.status === "active",
          isFailure: r.status === "void",
        }));
      }
      case "pos": {
        const { data } = await admin
          .from("payments")
          .select("tenant_id, status")
          .gte("paid_at", startIso)
          .lte("paid_at", endIso);
        return tallyByTenant((data ?? []) as { tenant_id: string; status: string | null }[], (r) => ({
          isSuccess: r.status === "completed",
          isFailure: r.status === "failed" || r.status === "voided",
        }));
      }
      case "customer.portal": {
        // success = at least one active customer session created in the week
        // failure = login attempts that locked the OTP row (attempts >= max)
        const { data } = await admin
          .from("customer_sessions")
          .select("tenant_id")
          .gte("created_at", startIso)
          .lte("created_at", endIso);
        return tallyByTenant((data ?? []) as { tenant_id: string }[], () => ({ isSuccess: true, isFailure: false }));
      }
      case "reservations": {
        const { data } = await admin
          .from("reservations")
          .select("tenant_id, status")
          .gte("scheduled_date", startDate)
          .lte("scheduled_date", endDate);
        return tallyByTenant((data ?? []) as { tenant_id: string; status: string | null }[], (r) => ({
          isSuccess: r.status === "completed",
          isFailure: r.status === "cancelled",
        }));
      }
      case "insurer.case_view": {
        // tenant_id is null on insurer-side logs; we tally by tenant_id of
        // the case being viewed. Skip rows that don't carry one.
        const { data } = await admin
          .from("insurer_access_logs")
          .select("tenant_id")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .not("tenant_id", "is", null);
        return tallyByTenant((data ?? []) as { tenant_id: string | null }[], () => ({
          isSuccess: true,
          isFailure: false,
        }));
      }
      case "anchoring.polygon": {
        const { data } = await admin
          .from("certificate_images")
          .select("tenant_id, polygon_tx_hash")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .not("polygon_tx_hash", "is", null);
        return tallyByTenant((data ?? []) as { tenant_id: string; polygon_tx_hash: string | null }[], () => ({
          isSuccess: true,
          isFailure: false,
        }));
      }
    }
  } catch (e) {
    logger.warn("feature-metrics-rollup: per-feature aggregation threw", {
      feature,
      error: e instanceof Error ? e.message : String(e),
    });
    return [];
  }
  return [];
}

function tallyByTenant<T extends { tenant_id: string | null }>(
  rows: T[],
  classify: (row: T) => { isSuccess: boolean; isFailure: boolean },
): TenantCount[] {
  const acc = new Map<string, { success: number; failure: number }>();
  for (const r of rows) {
    if (!r.tenant_id) continue;
    const c = classify(r);
    const cur = acc.get(r.tenant_id) ?? { success: 0, failure: 0 };
    if (c.isSuccess) cur.success += 1;
    if (c.isFailure) cur.failure += 1;
    acc.set(r.tenant_id, cur);
  }
  return [...acc.entries()].map(([tenant_id, v]) => ({ tenant_id, ...v }));
}

export async function GET(req: NextRequest) {
  const { authorized, error: authErr } = verifyCronRequest(req);
  if (!authorized) return apiUnauthorized(authErr);

  try {
    const admin = createServiceRoleAdmin("cron:feature-metrics-rollup — platform-wide ROI aggregation");

    const result = await withCronLock(admin, "feature-metrics-rollup", 1800, async () => {
      const { start, end, weekStartDate } = previousIsoWeekRange();
      const stats: Record<string, number> = { upserted: 0, failed: 0, features: FEATURES.length };

      for (const feature of FEATURES) {
        const counts = await aggregateFeature(admin, feature, start, end);
        if (counts.length === 0) continue;

        const rows = counts.map((c) => ({
          feature_id: feature,
          tenant_id: c.tenant_id,
          week_start: weekStartDate,
          success: c.success,
          failure: c.failure,
          computed_at: new Date().toISOString(),
        }));

        const { error } = await admin
          .from("feature_metrics_weekly")
          .upsert(rows, { onConflict: "feature_id,tenant_id,week_start" });

        if (error) {
          stats.failed += 1;
          logger.warn("feature-metrics-rollup: upsert failed", { feature, error: error.message });
        } else {
          stats.upserted += rows.length;
        }
      }

      return { week_start: weekStartDate, ...stats };
    });

    if (!result.acquired) return apiOk({ skipped: "lock_held" });
    logger.info("feature-metrics-rollup complete", result.value);
    return apiOk({ ok: true, ...result.value });
  } catch (e) {
    await sendCronFailureAlert("feature-metrics-rollup", e instanceof Error ? e.message : String(e));
    return apiInternalError(e, "cron/feature-metrics-rollup");
  }
}

// Exported for tests.
export const __testing = { previousIsoWeekRange };
