-- ================================================================
-- stripe_connect_transfers
-- プラットフォーム → 加盟店/代理店 への Transfer 記録
-- 手数料（application_fee）も含めて管理する
-- ================================================================

CREATE TABLE IF NOT EXISTS stripe_connect_transfers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Stripe IDs
  stripe_transfer_id        text UNIQUE NOT NULL,
  stripe_account_id         text NOT NULL,           -- 送金先 Connect acct_xxx
  stripe_payment_intent_id  text,                    -- 元となった PaymentIntent
  stripe_application_fee_id text,                    -- 手数料オブジェクト ID

  -- 送金先の解決（tenant / agent どちらか）
  tenant_id                 uuid REFERENCES tenants(id) ON DELETE SET NULL,
  agent_id                  uuid REFERENCES agents(id) ON DELETE SET NULL,

  -- 金額
  amount                    integer NOT NULL,         -- 送金額（税込、単位: 最小通貨）
  fee_amount                integer NOT NULL DEFAULT 0, -- 差し引いた手数料
  currency                  text NOT NULL DEFAULT 'jpy',

  -- ソース種別（どの機能から発生した送金か）
  source_type               text CHECK (source_type IN (
    'commission',      -- 代理店コミッション
    'invoice_payment', -- 請求書経由決済
    'pos_payment',     -- POS決済
    'shop_order',      -- ショップ注文
    'manual',          -- 手動送金
    'other'
  )),
  source_id                 text, -- agent_commissions.id など

  -- ステータス
  status                    text NOT NULL DEFAULT 'created'
    CHECK (status IN (
      'created',   -- Transfer オブジェクト作成済み
      'paid',      -- 送金完了（connected account に着金）
      'failed',    -- 送金失敗
      'reversed'   -- 返金・取消
    )),

  failure_message           text,
  transferred_at            timestamptz,
  reversed_at               timestamptz,
  metadata                  jsonb,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sct_account    ON stripe_connect_transfers(stripe_account_id);
CREATE INDEX idx_sct_tenant     ON stripe_connect_transfers(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_sct_agent      ON stripe_connect_transfers(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE INDEX idx_sct_status     ON stripe_connect_transfers(status);
CREATE INDEX idx_sct_created_at ON stripe_connect_transfers(created_at DESC);

-- updated_at 自動更新
CREATE TRIGGER trg_sct_updated_at
  BEFORE UPDATE ON stripe_connect_transfers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: platform admin のみ参照・操作
ALTER TABLE stripe_connect_transfers ENABLE ROW LEVEL SECURITY;

-- service_role（バックエンド）はすべて許可
CREATE POLICY sct_service_all ON stripe_connect_transfers
  USING (true)
  WITH CHECK (true);
