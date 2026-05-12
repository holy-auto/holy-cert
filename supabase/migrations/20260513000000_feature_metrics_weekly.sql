-- Feature ROI board — weekly metrics aggregation.
--
-- Roadmap: docs/feature-roi-board.md (PR #376 設計書)
--
-- Per (feature_id, tenant_id, week_start) row:
--   - success / failure counts of the feature's main action
--   - tenants_using / dau / wau (denormalized; kept per-row so the
--     UI can aggregate or drill down)
--
-- Phase 1 scope (this migration + the rollup cron):
--   - migration: this table
--   - cron: /api/cron/feature-metrics-rollup runs Monday 04:00 JST,
--     fills the previous ISO week's row per active tenant per feature
--   - UI: NOT in scope — first iteration is "raw rows visible in
--     Supabase Studio". Board UI comes in Phase 2.
--
-- ARR attribution and support_load are NOT computed yet — those need
-- pricing config + LLM categorization that are still pending.
-- The columns exist so we can backfill them later without a schema change.

CREATE TABLE IF NOT EXISTS feature_metrics_weekly (
  feature_id   text     NOT NULL,
  tenant_id    uuid     NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  week_start   date     NOT NULL,
  dau          int      NOT NULL DEFAULT 0,
  wau          int      NOT NULL DEFAULT 0,
  success      int      NOT NULL DEFAULT 0,
  failure      int      NOT NULL DEFAULT 0,
  arr_jpy      int      NOT NULL DEFAULT 0,
  support_load int      NOT NULL DEFAULT 0,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feature_id, tenant_id, week_start)
);

COMMENT ON TABLE feature_metrics_weekly IS
  'Feature ROI board — weekly per-(feature, tenant) metrics. Filled by /api/cron/feature-metrics-rollup. Design: docs/feature-roi-board.md.';

-- Index for "the latest N weeks across all tenants for one feature"
-- (the most common board query). Use desc on week_start so the planner
-- doesn't need an extra sort step for the dashboard listing.
CREATE INDEX IF NOT EXISTS idx_feature_metrics_feature_week
  ON feature_metrics_weekly (feature_id, week_start DESC);

-- Index for "the latest N weeks for one tenant across all features"
-- (per-tenant drill-down).
CREATE INDEX IF NOT EXISTS idx_feature_metrics_tenant_week
  ON feature_metrics_weekly (tenant_id, week_start DESC);

ALTER TABLE feature_metrics_weekly ENABLE ROW LEVEL SECURITY;

-- No tenant-facing access. Only platform admins read this via service-role.
-- Service-role bypasses RLS, so we add no policy here intentionally.
