-- Dashboard feature visibility: per-tenant availability gate +
-- per-user sidebar opt-in.
--
-- Background: the 加盟店 (tenant admin) dashboard exposes ~50 features.
-- Beginners are overwhelmed, so ADVANCED features are hidden by default
-- and surfaced through two independent layers:
--
--   tenant_feature_settings.disabled_features
--     Owner/admin turns an ADVANCED feature OFF for the whole tenant.
--     DEFAULT is empty => every advanced feature is AVAILABLE; the owner
--     gate is opt-out (only used to restrict).
--
--   user_feature_prefs.visible_features
--     Each user opts an available ADVANCED feature INTO their own sidebar.
--     DEFAULT is empty => advanced features are HIDDEN until the user
--     enables them (per-user opt-in).
--
-- Keys are the stable `key` values from src/lib/features/catalog.ts.
-- CORE features are always visible and are never stored here.
--
-- Writes happen through the service-role client (createTenantScopedAdmin),
-- so — like tenant_addons — RLS carries only a defensive SELECT policy;
-- there are no client-side writers to authorize.

CREATE TABLE IF NOT EXISTS tenant_feature_settings (
  tenant_id         uuid PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
  disabled_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_feature_settings IS
  'Per-tenant ADVANCED feature availability gate. disabled_features = catalog keys the owner/admin turned off for the whole tenant. Empty/default = every advanced feature is available.';

CREATE TABLE IF NOT EXISTS user_feature_prefs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  visible_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE user_feature_prefs IS
  'Per-user sidebar visibility opt-in for ADVANCED features. visible_features = catalog keys the user chose to show. Empty/default = advanced features are hidden for that user.';

ALTER TABLE tenant_feature_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feature_prefs ENABLE ROW LEVEL SECURITY;

-- Read: any member of the tenant can see their tenant's gate.
CREATE POLICY tenant_feature_settings_select_own ON tenant_feature_settings
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- Read: a user can see only their own preference rows, within their tenant.
CREATE POLICY user_feature_prefs_select_own ON user_feature_prefs
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()) AND user_id = auth.uid());
