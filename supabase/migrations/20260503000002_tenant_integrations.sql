-- =============================================================================
-- Tenant integrations:
--   - tenant_webhooks: 顧客の自社システム宛 outbound webhook 設定
--   - tenant_api_keys: 顧客の外部システムが Ledra REST API を叩くための鍵
--   - tenant_email_templates: メール文面のテナント別カスタム
-- 全テーブル tenant_id NOT NULL + RLS。
-- =============================================================================

-- ─── tenant_webhooks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** 配信先 URL */
  url             text NOT NULL CHECK (url ~ '^https://'),
  /** 購読 topic (ワイルドカード '*' または 'certificate.issued' 等) */
  topics          text[] NOT NULL DEFAULT ARRAY['*']::text[],
  /** HMAC 検証用の secret (顧客が自社で署名検証する。Ledra も同値を保管) */
  secret          text NOT NULL,
  description     text,
  is_active       boolean NOT NULL DEFAULT true,
  /** 直近の配送結果サマリ (UI 表示用) */
  last_delivery_at      timestamptz,
  last_delivery_status  text CHECK (last_delivery_status IS NULL OR last_delivery_status IN ('ok', 'errored')),
  last_delivery_error   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_webhooks_tenant
  ON tenant_webhooks (tenant_id, is_active);

ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_webhooks_select_own" ON tenant_webhooks
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- 書き込みは admin role のみ (tenant_memberships で制御済) なので簡易ポリシー
CREATE POLICY "tenant_webhooks_insert_own" ON tenant_webhooks
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenant_webhooks_update_own" ON tenant_webhooks
  FOR UPDATE USING (tenant_id IN (SELECT my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenant_webhooks_delete_own" ON tenant_webhooks
  FOR DELETE USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE TRIGGER trg_tenant_webhooks_updated_at
  BEFORE UPDATE ON tenant_webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── tenant_api_keys ─────────────────────────────────────────────────────────
-- key_hash: SHA-256(api_key + CUSTOMER_AUTH_PEPPER) を保管。生鍵は発行時のみ
--           クライアントに返却し、以降参照不可 (Stripe 流)。
-- prefix: UI 上で「sk_live_abcd... の鍵」の識別表示用 (先頭 8 文字)。
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** 表示用の先頭 (8〜12 文字) — `lk_live_` prefix 含む */
  prefix          text NOT NULL,
  /** SHA-256 ハッシュ (hex) — 認証時はリクエストの鍵を同様にハッシュ化して比較 */
  key_hash        text NOT NULL,
  description     text,
  /** 用途別スコープ — 配列。例: ['certificates:read', 'webhooks:write'] */
  scopes          text[] NOT NULL DEFAULT ARRAY[]::text[],
  /** 廃止までの有効期限 (任意。NULL は無期限) */
  expires_at      timestamptz,
  /** 直近使用時刻 (UI で「未使用 > 90日 → 削除推奨」を出す) */
  last_used_at    timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_api_keys_hash
  ON tenant_api_keys (key_hash);

CREATE INDEX IF NOT EXISTS idx_tenant_api_keys_tenant
  ON tenant_api_keys (tenant_id, revoked_at) WHERE revoked_at IS NULL;

ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_api_keys_select_own" ON tenant_api_keys
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenant_api_keys_insert_own" ON tenant_api_keys
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenant_api_keys_update_own" ON tenant_api_keys
  FOR UPDATE USING (tenant_id IN (SELECT my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));


-- ─── tenant_email_templates ──────────────────────────────────────────────────
-- 'topic' は固定キー (例 'booking_confirmation', 'certificate_issued')。
-- subject/body は Mustache 風の {{var}} を許容する。レンダリングは
-- src/lib/email/templates.ts で実装。
CREATE TABLE IF NOT EXISTS tenant_email_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  topic           text NOT NULL CHECK (length(topic) BETWEEN 1 AND 64),
  subject         text NOT NULL,
  body_html       text NOT NULL,
  body_text       text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 1 テナント / 1 topic で 1 active テンプレ
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_email_templates_active
  ON tenant_email_templates (tenant_id, topic) WHERE is_active = true;

ALTER TABLE tenant_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_email_templates_select_own" ON tenant_email_templates
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenant_email_templates_write_own" ON tenant_email_templates
  FOR ALL USING (tenant_id IN (SELECT my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE TRIGGER trg_tenant_email_templates_updated_at
  BEFORE UPDATE ON tenant_email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
