-- ============================================================
-- Manufacturer Memberships (read-only manufacturer portal)
-- ============================================================
-- Allows メーカー担当者 to authenticate via Supabase Auth and see
-- their own manufacturer's templates + certified contractors +
-- recent certificates (read-only).
--
-- The portal does not write to manufacturers / templates / certifications
-- — those remain platform-admin only. Memberships themselves are
-- created by the platform admin (運営) via invite email.
-- ============================================================

CREATE TABLE IF NOT EXISTS manufacturer_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'viewer'
                  CHECK (role IN ('admin', 'viewer')),
  display_name    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  invited_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (manufacturer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mfr_memberships_user
  ON manufacturer_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_mfr_memberships_mfr_active
  ON manufacturer_memberships (manufacturer_id)
  WHERE is_active = true;

-- ---- RLS --------------------------------------------------------------
ALTER TABLE manufacturer_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: manufacturer_ids the calling user is an active member of.
-- Mirrors my_tenant_ids() / my_insurer_ids() patterns elsewhere.
CREATE OR REPLACE FUNCTION my_manufacturer_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT manufacturer_id
  FROM public.manufacturer_memberships
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

-- Members can read their own membership rows. Writes flow through the
-- platform-admin API (createPlatformScopedAdmin bypasses RLS).
CREATE POLICY "mfr_memberships_select_own" ON manufacturer_memberships
  FOR SELECT USING (user_id = auth.uid());

-- ---- Extend RLS on existing manufacturer tables -----------------------
-- The original migration only exposes `is_active = true` rows of
-- manufacturers / templates to any authenticated user (so施工店 can
-- see the picker). Members must additionally see their own
-- manufacturer regardless of is_active, plus inactive templates for
-- audit purposes.

DROP POLICY IF EXISTS "manufacturers_member_select" ON manufacturers;
CREATE POLICY "manufacturers_member_select" ON manufacturers
  FOR SELECT USING (id IN (SELECT my_manufacturer_ids()));

DROP POLICY IF EXISTS "mfr_templates_member_select" ON manufacturer_templates;
CREATE POLICY "mfr_templates_member_select" ON manufacturer_templates
  FOR SELECT USING (manufacturer_id IN (SELECT my_manufacturer_ids()));

-- Allow manufacturer members to see their own certifications (both
-- active and revoked) — the dashboard surfaces revocation history.
DROP POLICY IF EXISTS "mct_member_select" ON manufacturer_certified_tenants;
CREATE POLICY "mct_member_select" ON manufacturer_certified_tenants
  FOR SELECT USING (manufacturer_id IN (SELECT my_manufacturer_ids()));

-- ---- updated_at trigger -----------------------------------------------
CREATE TRIGGER trg_mfr_memberships_updated_at
  BEFORE UPDATE ON manufacturer_memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
