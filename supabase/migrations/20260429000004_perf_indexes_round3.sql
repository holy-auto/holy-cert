-- Performance indexes — round 3 (size-aware)
--
-- 背景:
--   既存インデックスでカバーできていない高頻度クエリパターンを埋める。
--
-- 戦略 (将来の肥大化対応):
--   各 CREATE INDEX を pg_class.reltuples ベースのサイズチェックで包む。
--   - 推定 50万行未満     → 通常の CREATE INDEX を実行 (短時間ロック許容)
--   - 推定 50万行以上     → スキップして NOTICE を出力。operator が
--                           scripts/db/20260429_perf_indexes_round3_online.sql
--                           を psql から CONCURRENTLY で当てる
--
--   Supabase の SQL エディタ / migration runner は各ファイルを transaction
--   で囲うため CREATE INDEX CONCURRENTLY は 25001 で失敗する。サイズが
--   小さい間は通常の CREATE INDEX で十分。テーブル肥大化後は外部から
--   オンライン適用する運用に切り替える。
--
--   reltuples は ANALYZE の推定値 (誤差 ~5%)。閾値 500_000 は安全側に
--   設定しており、本番コーティング業界の単一テナントでは数年かかる規模。

-- ─── 1. notification_logs (target_id, type) ──────────────────────────
do $$
declare
  est_rows bigint;
begin
  select coalesce(reltuples, 0)::bigint into est_rows
  from pg_class where relname = 'notification_logs' and relkind = 'r';

  if est_rows < 500000 then
    create index if not exists idx_notification_logs_target_type
      on public.notification_logs (target_id, type);
  else
    raise notice 'notification_logs has ~% rows; SKIPPING idx_notification_logs_target_type. Run scripts/db/20260429_perf_indexes_round3_online.sql via psql.', est_rows;
  end if;
end $$;

-- ─── 2. notification_logs (tenant_id, type, created_at DESC) ─────────
do $$
declare
  est_rows bigint;
begin
  select coalesce(reltuples, 0)::bigint into est_rows
  from pg_class where relname = 'notification_logs' and relkind = 'r';

  if est_rows < 500000 then
    create index if not exists idx_notification_logs_tenant_type_created
      on public.notification_logs (tenant_id, type, created_at desc);
  else
    raise notice 'notification_logs has ~% rows; SKIPPING idx_notification_logs_tenant_type_created. Run scripts/db/20260429_perf_indexes_round3_online.sql via psql.', est_rows;
  end if;
end $$;

-- ─── 3. inventory_movements (tenant_id, created_at DESC) ─────────────
do $$
declare
  est_rows bigint;
begin
  select coalesce(reltuples, 0)::bigint into est_rows
  from pg_class where relname = 'inventory_movements' and relkind = 'r';

  if est_rows < 500000 then
    create index if not exists idx_inventory_movements_tenant_created
      on public.inventory_movements (tenant_id, created_at desc);
  else
    raise notice 'inventory_movements has ~% rows; SKIPPING idx_inventory_movements_tenant_created. Run scripts/db/20260429_perf_indexes_round3_online.sql via psql.', est_rows;
  end if;
end $$;
