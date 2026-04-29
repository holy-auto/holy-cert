-- Online (CONCURRENTLY) version of 20260429000004_perf_indexes_round3.sql
--
-- Use this when the migration auto-skipped because the target table is large
-- and you can't afford an AccessExclusiveLock. CREATE INDEX CONCURRENTLY
-- requires running OUTSIDE a transaction, so this file MUST be applied via
-- direct psql, not Supabase Studio's SQL editor or `supabase db push`.
--
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/20260429_perf_indexes_round3_online.sql
--
-- Notes:
--   - `IF NOT EXISTS` makes this re-runnable. If the migration already
--     created a non-concurrent index, this is a no-op (the existing
--     index serves queries fine).
--   - If a previous CONCURRENTLY run failed mid-build, the index is left
--     in INVALID state. Drop it before retrying:
--       DROP INDEX IF EXISTS idx_notification_logs_target_type;

create index concurrently if not exists idx_notification_logs_target_type
  on public.notification_logs (target_id, type);

create index concurrently if not exists idx_notification_logs_tenant_type_created
  on public.notification_logs (tenant_id, type, created_at desc);

create index concurrently if not exists idx_inventory_movements_tenant_created
  on public.inventory_movements (tenant_id, created_at desc);
