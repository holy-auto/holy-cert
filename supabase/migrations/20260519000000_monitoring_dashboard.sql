-- Monitoring dashboard: uptime history + in-app error log.
--
-- These are PLATFORM-level operational tables, intentionally NOT
-- tenant-scoped: they record the health of the whole Ledra deployment
-- (DB / Stripe / env / cron) and errors across every tenant, so the
-- 運営 (platform admin) monitoring site can compute uptime % and show a
-- recent-errors feed.
--
-- Writers are exclusively the service-role client (health-snapshot cron
-- and the central API error path via recordErrorEvent). There are no
-- client-side writers or readers; the monitoring site reads through a
-- platform-admin-gated API, never directly. RLS is therefore enabled with
-- NO policies (deny-all for anon/authenticated; service-role bypasses RLS)
-- as defense-in-depth.

-- ─── 1. system_health_snapshots ───────────────────────────────
-- One row per health probe (cron every ~5 min + manual triggers).
-- `status` mirrors /api/health: 'healthy' (all critical checks ok) or
-- 'degraded' (>=1 critical check failed). `checks` is the full per-check
-- payload so the UI can show exactly what was down at any point.
CREATE TABLE IF NOT EXISTS system_health_snapshots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL DEFAULT 'healthy',
  latency_ms  integer,
  checks      jsonb NOT NULL DEFAULT '{}'::jsonb,
  source      text NOT NULL DEFAULT 'cron',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE system_health_snapshots IS
  'Platform uptime history. One row per health probe (cron ~5min + manual). status = healthy|degraded mirrors /api/health. Service-role only; RLS deny-all.';

-- Uptime windows always query "snapshots since T ordered by time", so a
-- single (captured_at DESC) index serves every dashboard query. Index on
-- a freshly CREATEd table → no concurrent writers, lock is harmless.
CREATE INDEX IF NOT EXISTS idx_health_snapshots_captured_at
  ON system_health_snapshots (captured_at DESC);

ALTER TABLE system_health_snapshots ENABLE ROW LEVEL SECURITY;

-- ─── 2. error_events ──────────────────────────────────────────
-- In-app error log. Written from the central 500 path (apiInternalError)
-- and cron failure alerting (sendCronFailureAlert). `fingerprint` groups
-- repeats so the UI can collapse "same error x N". `request_id` ties a row
-- back to the x-request-id correlation id for cross-system tracing.
CREATE TABLE IF NOT EXISTS error_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  level       text NOT NULL DEFAULT 'error',
  source      text NOT NULL DEFAULT 'api',
  message     text NOT NULL,
  fingerprint text,
  request_id  text,
  route       text,
  tenant_id   uuid,
  context     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE error_events IS
  'Platform error log. Written by apiInternalError + sendCronFailureAlert. NOT tenant-scoped (tenant_id is informational). Service-role only; RLS deny-all.';

-- Feed is "recent errors ordered by time", optionally filtered by level.
CREATE INDEX IF NOT EXISTS idx_error_events_occurred_at
  ON error_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_events_level_occurred_at
  ON error_events (level, occurred_at DESC);

-- Grouping repeats ("same fingerprint in last 24h").
CREATE INDEX IF NOT EXISTS idx_error_events_fingerprint
  ON error_events (fingerprint, occurred_at DESC);

ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
