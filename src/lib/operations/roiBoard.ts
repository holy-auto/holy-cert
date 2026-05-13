/**
 * Feature ROI board — aggregation logic over `feature_metrics_weekly`.
 *
 * Reads service-role rows (no RLS-scoped client) and shapes them into the
 * per-feature summary that the platform-admin board renders. The cron
 * route owns writes; this module is read-only.
 *
 * Design: docs/feature-roi-board.md §4 (UI Mock) + §5 (Phase 2).
 */

import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type FeatureMetricRow = {
  feature_id: string;
  tenant_id: string;
  week_start: string; // ISO date "YYYY-MM-DD"
  dau: number;
  wau: number;
  success: number;
  failure: number;
  arr_jpy: number;
  support_load: number;
  computed_at: string;
};

export type FeatureSummary = {
  feature_id: string;
  success_total: number;
  failure_total: number;
  tenants_using: number;
  success_rate: number | null; // success / (success+failure); null when both zero
  arr_jpy_total: number;
  support_load_total: number;
  /** Per-week point counts so the UI can sparkline the trend without
   *  fetching the raw rows again. Ordered oldest → newest. */
  weekly: Array<{ week_start: string; success: number; failure: number }>;
  /** Heuristic from docs/feature-roi-board.md §6: low usage + low success. */
  flag: "freeze_candidate" | "watch" | "healthy";
};

export type RoiBoardSnapshot = {
  /** ISO date of the most-recent week_start in the data set, or null if empty. */
  latest_week: string | null;
  /** ISO date of the earliest week_start considered, or null if empty. */
  earliest_week: string | null;
  /** Per-feature aggregates, descending by success_total. */
  features: FeatureSummary[];
  /** Total tenant count across all features (denominator for "tenants_using"). */
  total_tenants_active: number;
};

const WEEKS_TO_FETCH = 4;

/**
 * Heuristic for "freeze candidate" tagging.
 *
 * Mirrors docs/feature-roi-board.md §6: a feature with very low
 * (success_rate * usage_share) is a candidate for sunsetting. Thresholds
 * are deliberately loose — the board is a discussion starter, not an
 * autonomous kill-switch.
 */
export function classifyFeature(s: {
  success_total: number;
  failure_total: number;
  tenants_using: number;
  total_tenants_active: number;
}): FeatureSummary["flag"] {
  const usageShare = s.total_tenants_active > 0 ? s.tenants_using / s.total_tenants_active : 0;
  const reach = s.success_total + s.failure_total;
  const rate = reach > 0 ? s.success_total / reach : 0;
  // freeze_candidate: tenants_using < 5% of total AND success_total < 30
  if (usageShare < 0.05 && s.success_total < 30) return "freeze_candidate";
  // watch: success_rate below 70% even though usage is OK
  if (rate < 0.7 && reach >= 10) return "watch";
  return "healthy";
}

/**
 * Build the ROI board snapshot. Reads the latest `weeks` weeks of
 * `feature_metrics_weekly` and groups them by feature.
 *
 * Failure modes:
 *   - DB error → returns an empty snapshot and logs a warning. The board
 *     page renders an empty-state instead of bubbling the error.
 */
export async function getRoiBoardSnapshot(weeks: number = WEEKS_TO_FETCH): Promise<RoiBoardSnapshot> {
  const admin = createServiceRoleAdmin("platform admin ROI board — cross-tenant feature_metrics_weekly aggregation");

  // We don't know the latest week up front — let the DB tell us, then
  // filter to the last `weeks` distinct ISO weeks.
  const { data: rows, error } = await admin
    .from("feature_metrics_weekly")
    .select("feature_id, tenant_id, week_start, dau, wau, success, failure, arr_jpy, support_load, computed_at")
    .order("week_start", { ascending: false })
    .limit(2000); // hard cap; ~6 features × ~120 tenants × 4 weeks = 2880 in theory, but typical is much smaller

  if (error) {
    logger.warn("roiBoard: snapshot fetch failed; rendering empty", { error: error.message });
    return { latest_week: null, earliest_week: null, features: [], total_tenants_active: 0 };
  }

  const allRows = (rows ?? []) as FeatureMetricRow[];
  if (allRows.length === 0) {
    return { latest_week: null, earliest_week: null, features: [], total_tenants_active: 0 };
  }

  // Pick the most-recent `weeks` distinct week_start values.
  const weekStartsDescending = Array.from(new Set(allRows.map((r) => r.week_start)))
    .sort()
    .reverse();
  const inScope = new Set(weekStartsDescending.slice(0, weeks));
  const scoped = allRows.filter((r) => inScope.has(r.week_start));

  const weeklySorted = Array.from(inScope).sort(); // oldest first

  // Group by feature
  const byFeature = new Map<string, FeatureMetricRow[]>();
  for (const row of scoped) {
    const arr = byFeature.get(row.feature_id) ?? [];
    arr.push(row);
    byFeature.set(row.feature_id, arr);
  }

  // Compute total active tenants (any row in scope means "active")
  const activeTenantIds = new Set<string>();
  for (const row of scoped) activeTenantIds.add(row.tenant_id);
  const totalTenantsActive = activeTenantIds.size;

  const features: FeatureSummary[] = [];
  for (const [feature_id, fRows] of byFeature) {
    let success_total = 0;
    let failure_total = 0;
    let arr_jpy_total = 0;
    let support_load_total = 0;
    const tenants = new Set<string>();
    const weeklyAgg = new Map<string, { success: number; failure: number }>();

    for (const row of fRows) {
      success_total += row.success;
      failure_total += row.failure;
      arr_jpy_total += row.arr_jpy;
      support_load_total += row.support_load;
      // "tenants using" = tenants with at least one success in the window
      if (row.success > 0) tenants.add(row.tenant_id);
      const w = weeklyAgg.get(row.week_start) ?? { success: 0, failure: 0 };
      w.success += row.success;
      w.failure += row.failure;
      weeklyAgg.set(row.week_start, w);
    }

    const reach = success_total + failure_total;
    const success_rate = reach > 0 ? success_total / reach : null;
    const tenants_using = tenants.size;
    const flag = classifyFeature({
      success_total,
      failure_total,
      tenants_using,
      total_tenants_active: totalTenantsActive,
    });
    const weekly = weeklySorted.map((week_start) => ({
      week_start,
      success: weeklyAgg.get(week_start)?.success ?? 0,
      failure: weeklyAgg.get(week_start)?.failure ?? 0,
    }));

    features.push({
      feature_id,
      success_total,
      failure_total,
      tenants_using,
      success_rate,
      arr_jpy_total,
      support_load_total,
      weekly,
      flag,
    });
  }

  features.sort((a, b) => b.success_total - a.success_total);

  return {
    latest_week: weeklySorted[weeklySorted.length - 1] ?? null,
    earliest_week: weeklySorted[0] ?? null,
    features,
    total_tenants_active: totalTenantsActive,
  };
}

/** CSV-encode the snapshot for download by exec/finance. One row per feature. */
export function snapshotToCsv(snapshot: RoiBoardSnapshot): string {
  const header = [
    "feature_id",
    "success_total",
    "failure_total",
    "tenants_using",
    "total_tenants_active",
    "success_rate",
    "arr_jpy_total",
    "support_load_total",
    "flag",
    "earliest_week",
    "latest_week",
  ];

  const rows = snapshot.features.map((f) =>
    [
      f.feature_id,
      String(f.success_total),
      String(f.failure_total),
      String(f.tenants_using),
      String(snapshot.total_tenants_active),
      f.success_rate === null ? "" : f.success_rate.toFixed(4),
      String(f.arr_jpy_total),
      String(f.support_load_total),
      f.flag,
      snapshot.earliest_week ?? "",
      snapshot.latest_week ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );

  // Excel-friendly: prepend UTF-8 BOM so Japanese characters render correctly
  // when finance opens the CSV directly in Excel for Windows.
  return "﻿" + [header.join(","), ...rows].join("\n") + "\n";
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
