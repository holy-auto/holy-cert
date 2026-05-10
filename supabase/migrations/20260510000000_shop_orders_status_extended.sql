-- ============================================================
-- shop_orders.status の許可値を拡張する。
--
-- /api/admin/shop/checkout は Stripe Checkout Session 作成の
-- ライフサイクルを下記の中間ステータスで管理する設計だが、
-- 元の CHECK 制約には含まれていなかったため、INSERT/UPDATE が
-- すべて check constraint violation で失敗していた:
--   - pending_checkout : Stripe session 作成前の仮レコード
--   - pending_payment  : Stripe session 作成済み・支払い待ち
--   - checkout_failed  : Stripe API 失敗時のクリーンアップ後
--
-- 既存の値 ('pending', 'paid', ...) は維持する。
-- 既存テーブルのフルスキャンを避けるため NOT VALID で追加し、
-- VALIDATE は後続 migration で実行する。
-- 参照: docs/operations/zero-downtime-migrations.md (rule 7)
-- ============================================================

ALTER TABLE shop_orders
  DROP CONSTRAINT IF EXISTS shop_orders_status_check;

ALTER TABLE shop_orders
  ADD CONSTRAINT shop_orders_status_check
  CHECK (
    status IN (
      'pending',
      'pending_checkout',
      'pending_payment',
      'checkout_failed',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled'
    )
  ) NOT VALID;
