-- =============================================================================
-- 顧客の権利行使 (個人情報保護法 第 30/32 条 + GDPR 第 15-17 条)
--   - customer_deletion_requests: 削除請求 (30 日のクーリングオフ → cron で実行)
--   - customer_audit_log_views:    顧客が「自分のデータが誰に閲覧されたか」を見るためのログ
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_deletion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** リクエストを起こした顧客 (null の場合は customer_email + phone_hash で識別) */
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  email           text NOT NULL,
  phone_last4_hash text,
  reason          text,
  /** 'pending' = クーリングオフ中 / 'cancelled' = 顧客が撤回 / 'executed' = 削除済 */
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'cancelled', 'executed', 'errored')),
  scheduled_for   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  executed_at     timestamptz,
  cancelled_at    timestamptz,
  error_message   text,
  /** リクエスト時に取得した IP (誤請求調査 + 法的証跡) */
  source_ip       inet,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_deletion_pending
  ON customer_deletion_requests (status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_customer_deletion_tenant_email
  ON customer_deletion_requests (tenant_id, email);

ALTER TABLE customer_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_deletion_select_own_tenant" ON customer_deletion_requests
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- 書き込みは service-role 経由のみ (顧客ポータル endpoint からは
-- service-role admin client で insert する。RLS は SELECT のみ顧客テナント可)。
