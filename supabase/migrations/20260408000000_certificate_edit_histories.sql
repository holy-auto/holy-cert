-- =============================================================================
-- Certificate Edit Histories
-- Tracks field-level changes when a certificate is edited after issuance.
-- =============================================================================

CREATE TABLE IF NOT EXISTS certificate_edit_histories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id  uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  edited_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version         integer NOT NULL DEFAULT 1,
  changes         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- changes format: [{ "field": "customer_name", "label": "顧客名", "old": "田中", "new": "田中太郎" }, ...]
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_edit_hist_cert
  ON certificate_edit_histories(certificate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cert_edit_hist_tenant
  ON certificate_edit_histories(tenant_id);

ALTER TABLE certificate_edit_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cert_edit_hist_select" ON certificate_edit_histories
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "cert_edit_hist_insert" ON certificate_edit_histories
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));
