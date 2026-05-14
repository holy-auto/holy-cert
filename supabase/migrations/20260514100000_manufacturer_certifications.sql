-- ============================================================
-- Manufacturers · Manufacturer Templates · Certified Tenants
-- ============================================================
-- Adds the data model that lets Ledra-operated platform admins
-- maintain a directory of OEM/coating/PPF "manufacturers" (メーカー),
-- manage one or more fixed certificate designs per manufacturer,
-- and grant individual tenants the right to issue certificates
-- under those designs as 認定施工店 (certified contractors).
--
-- Decisions encoded here:
--   * Manufacturers own their template designs; contractors cannot
--     edit them (write paths are platform-admin only via service role).
--   * One manufacturer may publish multiple templates (e.g. by
--     product line / service type).
--   * Certifications are granted per (manufacturer, tenant) and have
--     no expiry — they are revoked explicitly.
--   * `certificates` gains optional FKs to manufacturer + template
--     so the PDF renderer can pick the manufacturer-fixed design.
-- ============================================================

-- ---- 1) manufacturers --------------------------------------------------
CREATE TABLE IF NOT EXISTS manufacturers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  logo_asset_path TEXT,
  website_url     TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manufacturers_active ON manufacturers (is_active);

-- ---- 2) manufacturer_templates ----------------------------------------
-- One row = one fixed design owned by a manufacturer. `config_json`
-- mirrors the existing tenant_template_configs.config_json shape
-- (see src/types/templateOption.ts → TemplateConfig) so the same
-- branded PDF renderer can be reused without a new layout engine.
CREATE TABLE IF NOT EXISTS manufacturer_templates (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id  UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  service_type     TEXT
                   CHECK (service_type IN ('coating','ppf','maintenance','body_repair','general')),
  config_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  layout_key       TEXT NOT NULL DEFAULT 'standard',
  thumbnail_path   TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfr_templates_manufacturer
  ON manufacturer_templates (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_mfr_templates_active
  ON manufacturer_templates (manufacturer_id, is_active);

-- ---- 3) manufacturer_certified_tenants --------------------------------
-- Active row = the tenant is currently certified by the manufacturer
-- and may issue certificates under its templates. Revocation flips
-- status to 'revoked' and stamps revoked_at; rows are kept for audit.
CREATE TABLE IF NOT EXISTS manufacturer_certified_tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id  UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','revoked')),
  notes            TEXT,
  certified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  certified_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at       TIMESTAMPTZ,
  revoked_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manufacturer_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_mct_tenant
  ON manufacturer_certified_tenants (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mct_active
  ON manufacturer_certified_tenants (tenant_id, status)
  WHERE status = 'active';

-- ---- 4) certificates: link to manufacturer template -------------------
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS manufacturer_id UUID
    REFERENCES manufacturers(id) ON DELETE SET NULL;
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS manufacturer_template_id UUID
    REFERENCES manufacturer_templates(id) ON DELETE SET NULL;

-- The supporting index on certificates.manufacturer_id is created
-- CONCURRENTLY in the sibling migration 20260514100001 so production
-- writes against `certificates` are not blocked.

-- ---- 5) RLS ------------------------------------------------------------
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_certified_tenants ENABLE ROW LEVEL SECURITY;

-- manufacturers: every authenticated user can read active records so
-- tenants can render names/logos in the certificate-issue UI. Writes
-- go through service-role API routes guarded by isPlatformAdmin().
CREATE POLICY "manufacturers_select" ON manufacturers
  FOR SELECT USING (is_active = true);

-- manufacturer_templates: visible to authenticated users when the
-- parent manufacturer is active and the template is active. The
-- tenant-side picker further filters by certification status.
CREATE POLICY "mfr_templates_select" ON manufacturer_templates
  FOR SELECT USING (
    is_active = true
    AND manufacturer_id IN (
      SELECT id FROM manufacturers WHERE is_active = true
    )
  );

-- manufacturer_certified_tenants: a tenant member may read their own
-- tenant's certifications (for the picker / dashboard). Writes are
-- platform-admin only via service-role API.
CREATE POLICY "mct_select_own_tenant" ON manufacturer_certified_tenants
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- ---- 6) updated_at triggers -------------------------------------------
CREATE TRIGGER trg_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mfr_templates_updated_at
  BEFORE UPDATE ON manufacturer_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_mct_updated_at
  BEFORE UPDATE ON manufacturer_certified_tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
