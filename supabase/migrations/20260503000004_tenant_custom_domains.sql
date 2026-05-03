-- =============================================================================
-- White-label / カスタムドメイン scaffolding
--   tenant_custom_domains: 各テナントが自社ドメインで顧客ポータルを公開するための
--                          ホスト名と検証状態を管理。
--
-- フロー:
--   1. テナント管理者が UI で `pf.example.co.jp` を登録 → status='pending_verify'
--   2. 検証用 TXT レコード (verification_token) をルートに配置してもらう
--   3. cron が DNS lookup で TXT を確認 → status='verified'
--   4. proxy.ts が Host header を見て tenant_id を解決し、
--      `/customer/{slug}` への内部リダイレクトに置き換える
--
-- ベース TLS 証明書は Vercel が wildcard preview 用に持つ。カスタムドメインは
-- Vercel Domains API で自動発行 (本実装はそこまではカバーしない)。
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_custom_domains (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** 完全修飾ドメイン (FQDN) — 全テナント全体で一意 */
  hostname        text NOT NULL,
  /** 検証用 TXT レコード値 (顧客が DNS に置く) */
  verification_token text NOT NULL,
  status          text NOT NULL DEFAULT 'pending_verify'
                  CHECK (status IN ('pending_verify', 'verified', 'errored', 'disabled')),
  verified_at     timestamptz,
  last_check_at   timestamptz,
  last_error      text,
  /** Vercel Domains API で発行されたデプロイメント ID */
  vercel_domain_id text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_custom_domains_hostname
  ON tenant_custom_domains (lower(hostname));

CREATE INDEX IF NOT EXISTS idx_tenant_custom_domains_tenant
  ON tenant_custom_domains (tenant_id);

ALTER TABLE tenant_custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_custom_domains_select_own" ON tenant_custom_domains
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- 書き込みは admin 用エンドポイントから service-role 経由のみ。
