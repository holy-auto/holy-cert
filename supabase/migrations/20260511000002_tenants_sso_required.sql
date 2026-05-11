-- Enterprise SSO enforcement.
--
-- When `sso_required = true`, password sign-in for any user whose email
-- belongs to `sso_email_domain` is blocked at the application layer
-- (see `src/lib/auth/ssoPolicy.ts`). They must complete SAML SSO via
-- /api/auth/sso/start.
--
-- `sso_email_domain` is the unique part *after* the @ that the customer
-- guarantees to own. Stored lowercase, no leading @. NULL means no SSO
-- domain mapping exists yet (so sso_required is meaningless until it's set).
--
-- This is application-layer enforcement (cheaper to ship than wiring up
-- Postgres-level CHECK constraints across the existing auth schema). The
-- actual IdP binding lives in Supabase Auth (auth.sso_providers / sso_domains);
-- this column is the "should we even allow password fallback?" knob.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS sso_required     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sso_email_domain text;

COMMENT ON COLUMN tenants.sso_required IS
  'When true, application layer blocks password sign-in for emails whose domain matches sso_email_domain. Set only after the customer IdP is registered in Supabase Auth and tested.';
COMMENT ON COLUMN tenants.sso_email_domain IS
  'Lowercased email domain (no @) the customer controls. Required for sso_required to have any effect.';

-- NOTE: the lookup index (sso_email_domain) WHERE sso_required = true
-- is created in the sibling migration 20260511000003_tenants_sso_required_index.sql
-- with CREATE INDEX CONCURRENTLY (lint rule).
