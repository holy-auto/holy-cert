-- Performance indexes — round 3
--
-- 背景:
--   最近のコード追加で notification_logs / inventory_movements に
--   既存インデックスでカバーできていない高頻度クエリパターンが発生。
--   seq scan / heap filter にフォールバックする箇所を埋める。
--
-- 注意:
--   Supabase の SQL エディタ / migration runner は各ファイルを
--   トランザクションで包むため、CREATE INDEX CONCURRENTLY は
--   25001 エラーになる。対象テーブルは中規模で AccessExclusiveLock
--   の保持時間も短いため、通常の CREATE INDEX で許容する。
--   （psql から個別に実行する場合は CONCURRENTLY を手動で追加可）

-- ─── 1. notification_logs (target_id, type) ──────────────────────────
-- followUp.ts の idempotency 確認:
--   .in("target_id", certIds).eq("type", notifType)
-- 既存の (target_type, target_id, type) は target_type が先頭にあるため
-- target_type を WHERE に含まないこのクエリでは効かない。
create index if not exists idx_notification_logs_target_type
  on public.notification_logs (target_id, type);

-- ─── 2. notification_logs (tenant_id, type, created_at DESC) ─────────
-- 日次 cron (low_stock_alert / maintenance_reminder) の冪等チェック:
--   .eq("tenant_id", t).eq("type", x).gte("created_at", todayStart)
-- 既存の (tenant_id, type) でも引けるが、created_at を含めると
-- range filter まで index で完結し HOT 行のみ heap fetch になる。
create index if not exists idx_notification_logs_tenant_type_created
  on public.notification_logs (tenant_id, type, created_at desc);

-- ─── 3. inventory_movements (tenant_id, created_at DESC) ─────────────
-- 新しい入出庫履歴一覧 API は item_id 無しでも使えるようにページング化:
--   .eq("tenant_id", t).order("created_at", desc).range(from, to)
-- 既存の (item_id, created_at DESC) は item_id 必須。
-- (tenant_id) 単独 index では sort 段階で別途 work_mem を消費する。
create index if not exists idx_inventory_movements_tenant_created
  on public.inventory_movements (tenant_id, created_at desc);
