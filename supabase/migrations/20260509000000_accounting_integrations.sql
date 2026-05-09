-- =============================================================================
-- Accounting integrations (freee / マネーフォワード クラウド)
--
-- 加盟店 (施工店) が利用する会計ソフトに、Ledra で発生した売上 (請求書 / POS /
-- Stripe Connect) を仕訳として自動投入するための基盤テーブル群。
--
-- - accounting_integrations: テナント × プロバイダごとの OAuth 接続情報
-- - accounting_sync_records: 仕訳 1 件ごとの冪等性管理 (重複投入防止)
-- - accounting_sync_runs:    バッチ同期実行ログ (cron 監査用)
--
-- 設計メモ:
--   * Square の `square_connections` パターンを踏襲し、access/refresh token は
--     `_ciphertext` 列のみで保管 (`@/lib/crypto/secretBox`)。
--   * unique(tenant_id, provider) で 1 テナント = 1 接続/プロバイダ。
--   * unique(tenant_id, provider, source_type, source_id) を冪等キーにし、
--     同一書類 / 決済を 2 度仕訳しないようにする。
--   * RLS は square と同一形 — メンバー全員 SELECT、書込は admin/owner のみ。
-- =============================================================================

-- ─── 1) accounting_integrations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_integrations (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider                    text        NOT NULL CHECK (provider IN ('freee', 'moneyforward')),

  -- OAuth tokens (envelope-encrypted; decoded via @/lib/crypto/tenantSecrets)
  access_token_ciphertext     text,
  refresh_token_ciphertext    text,
  token_expires_at            timestamptz,

  -- 接続先の事業所 (freee: company_id, MF: office_id)
  external_company_id         text,
  external_company_name       text,

  -- 加盟店の入力を最小化するためのデフォルト設定 (連携時に自動取得して保存)
  default_sales_account_id    text,         -- 「売上高」勘定科目 ID
  default_sales_account_name  text,
  default_tax_code            text,         -- 標準税率 10% 税区分コード
  default_tax_rate            integer       CHECK (default_tax_rate IS NULL OR default_tax_rate IN (0, 8, 10)),
  default_partner_id          text,         -- "諸口" / 不明客フォールバック取引先

  auto_sync_enabled           boolean       NOT NULL DEFAULT true,
  status                      text          NOT NULL DEFAULT 'pending'
                                            CHECK (status IN ('pending', 'active', 'disconnected', 'error')),
  last_synced_at              timestamptz,
  last_error                  text,
  connected_at                timestamptz,
  connected_by                uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  timestamptz   NOT NULL DEFAULT now(),
  updated_at                  timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT uq_accounting_integrations_tenant_provider UNIQUE (tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_accounting_integrations_tenant
  ON accounting_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_integrations_active
  ON accounting_integrations(provider, status) WHERE status = 'active';

COMMENT ON TABLE accounting_integrations IS
  '加盟店 (テナント) と外部会計ソフト (freee / マネーフォワード) の OAuth 接続。1 テナント × プロバイダで 1 行。';
COMMENT ON COLUMN accounting_integrations.default_sales_account_id IS
  '初回連携時に「売上高」勘定科目を自動検出して保存。加盟店が後から /admin/accounting で変更可能。';
COMMENT ON COLUMN accounting_integrations.default_partner_id IS
  '取引先が特定できない (飛び込み客 / 顧客未登録) 売上の fallback。NULL なら provider 標準の "諸口" を使う。';

-- ─── 2) accounting_sync_records ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_sync_records (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider            text          NOT NULL CHECK (provider IN ('freee', 'moneyforward')),

  -- 仕訳ソース (冪等キー)
  source_type         text          NOT NULL CHECK (source_type IN ('document', 'pos_checkout', 'stripe_payment')),
  source_id           uuid          NOT NULL,

  -- 外部 ID (freee: deal_id, MF: transaction_id)
  external_id         text,

  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'synced', 'failed', 'skipped')),
  error_message       text,
  attempt_count       integer       NOT NULL DEFAULT 0,

  -- snapshot of synced amount for audit
  amount              integer,
  tax_amount          integer,

  synced_at           timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT uq_accounting_sync_records_idempotency
    UNIQUE (tenant_id, provider, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_sync_records_tenant
  ON accounting_sync_records(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_accounting_sync_records_pending
  ON accounting_sync_records(tenant_id, status)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_accounting_sync_records_source
  ON accounting_sync_records(source_type, source_id);

COMMENT ON TABLE accounting_sync_records IS
  '会計ソフトに送った仕訳 1 件ごとの状態管理。unique(tenant_id, provider, source_type, source_id) で同一売上の二重投入を防止。';

-- ─── 3) accounting_sync_runs (audit log) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_sync_runs (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider            text          NOT NULL CHECK (provider IN ('freee', 'moneyforward')),
  trigger_type        text          NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'webhook')),
  triggered_by        uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  status              text          NOT NULL DEFAULT 'running'
                                    CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  records_attempted   integer       NOT NULL DEFAULT 0,
  records_synced      integer       NOT NULL DEFAULT 0,
  records_failed      integer       NOT NULL DEFAULT 0,
  records_skipped     integer       NOT NULL DEFAULT 0,
  errors_json         jsonb         NOT NULL DEFAULT '[]'::jsonb,
  started_at          timestamptz   NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accounting_sync_runs_tenant
  ON accounting_sync_runs(tenant_id, started_at DESC);

COMMENT ON TABLE accounting_sync_runs IS
  'バッチ同期 (cron / 手動) 1 回分の実行ログ。加盟店向け UI で "今月◯件同期済み" を見せるソース。';

-- ─── 4) RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE accounting_integrations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_sync_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_sync_runs     ENABLE ROW LEVEL SECURITY;

-- accounting_integrations: SELECT/UPDATE = members, INSERT/DELETE = admin+
CREATE POLICY accounting_integrations_select ON accounting_integrations
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY accounting_integrations_insert ON accounting_integrations
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

CREATE POLICY accounting_integrations_update ON accounting_integrations
  FOR UPDATE USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY accounting_integrations_delete ON accounting_integrations
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

-- accounting_sync_records: SELECT = members, INSERT/UPDATE = admin+
CREATE POLICY accounting_sync_records_select ON accounting_sync_records
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY accounting_sync_records_insert ON accounting_sync_records
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

CREATE POLICY accounting_sync_records_update ON accounting_sync_records
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

-- accounting_sync_runs: SELECT = members, INSERT/UPDATE = admin+
CREATE POLICY accounting_sync_runs_select ON accounting_sync_runs
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY accounting_sync_runs_insert ON accounting_sync_runs
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

CREATE POLICY accounting_sync_runs_update ON accounting_sync_runs
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner', 'admin')
  );

-- ─── 5) updated_at triggers ────────────────────────────────────────────────────
CREATE TRIGGER trg_accounting_integrations_updated_at
  BEFORE UPDATE ON accounting_integrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_accounting_sync_records_updated_at
  BEFORE UPDATE ON accounting_sync_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
