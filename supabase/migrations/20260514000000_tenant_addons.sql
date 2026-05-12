-- Per-tenant feature add-ons (opt-in, off by default).
--
-- Originated from C-3 (docs/ledra-goals-strategy-2026-05.md §6): the
-- marketplace/B2B/Deals features cost engineering attention but did not
-- map onto Lighthouse (損保ジャパン) requirements. They become opt-in
-- add-ons so a tenant must explicitly enable them rather than getting
-- them by default with a base plan.
--
-- Schema:
--   addon_key — string key, see src/lib/billing/addons.ts ADDON_KEYS
--   enabled_at — when the tenant turned the add-on on
--   disabled_at — soft-disable; we keep the row for billing/audit history
--   notes — free-form ops note (e.g. "owner requested via support 2026-05-14")
--
-- Backfill: every tenant that already has data in the add-on's underlying
-- table is grandfathered IN so we do not break existing usage. New tenants
-- created after this migration must explicitly enable the add-on.

CREATE TABLE IF NOT EXISTS tenant_addons (
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  addon_key   text NOT NULL,
  enabled_at  timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  notes       text,
  PRIMARY KEY (tenant_id, addon_key)
);

COMMENT ON TABLE tenant_addons IS
  'Per-tenant opt-in feature add-ons. Off by default for new tenants; existing tenants with usage are grandfathered in by the same migration that creates this table.';

ALTER TABLE tenant_addons ENABLE ROW LEVEL SECURITY;

-- Read: any member of the tenant can see what add-ons their tenant has.
-- Write: platform admins only — we deliberately keep enable/disable behind
-- a manual support process so it cannot be self-served until pricing is
-- finalized.
CREATE POLICY tenant_addons_select_own ON tenant_addons
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

-- Backfill: grandfather every tenant that has at least one row in the
-- underlying add-on table. NULL-safe; "no rows" → no entry.

-- market_vehicles: anyone who has ever listed a vehicle.
INSERT INTO tenant_addons (tenant_id, addon_key, enabled_at, notes)
SELECT DISTINCT tenant_id, 'market_vehicles', now(), 'grandfathered from existing market_vehicles usage'
FROM market_vehicles
ON CONFLICT (tenant_id, addon_key) DO NOTHING;

-- btob (job_orders): anyone who has at least one job_order on either side.
INSERT INTO tenant_addons (tenant_id, addon_key, enabled_at, notes)
SELECT DISTINCT from_tenant_id, 'btob', now(), 'grandfathered from existing job_orders usage'
FROM job_orders
WHERE from_tenant_id IS NOT NULL
ON CONFLICT (tenant_id, addon_key) DO NOTHING;

INSERT INTO tenant_addons (tenant_id, addon_key, enabled_at, notes)
SELECT DISTINCT to_tenant_id, 'btob', now(), 'grandfathered from existing job_orders usage'
FROM job_orders
WHERE to_tenant_id IS NOT NULL
ON CONFLICT (tenant_id, addon_key) DO NOTHING;
