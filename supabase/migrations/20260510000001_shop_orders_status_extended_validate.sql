-- ============================================================
-- 20260510000000 で NOT VALID 追加した制約を VALIDATE する。
-- VALIDATE CONSTRAINT は ShareUpdateExclusiveLock のみで動くため
-- 既存行の整合性スキャンを安全に流せる。
-- 参照: docs/operations/zero-downtime-migrations.md (rule 7)
-- ============================================================

ALTER TABLE shop_orders VALIDATE CONSTRAINT shop_orders_status_check;
