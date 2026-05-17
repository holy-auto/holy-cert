-- =============================================================
-- Vehicle History Report — Paid access (CARFAX-style paywall)
--
-- Third parties (e.g. 買取店 / 整備工場) landing on the public
-- `/c/[public_id]` certificate page can purchase a one-time,
-- account-less view of the aggregated cross-tenant vehicle
-- history at `/v/[vin]` (the existing `vehicle_passports`
-- projection). The free view stays minimal (trust summary only);
-- the full timeline is gated behind a per-report payment.
--
-- Access model:
--   - `vehicle_report_settings`: single platform-wide row holding
--     the report price (passport history spans many tenants, so
--     pricing is a Ledra-level decision, not per-tenant).
--   - `vehicle_report_orders`: one row per purchase attempt. After
--     Stripe `checkout.session.completed`, the row is marked paid
--     and its random `access_token` unlocks `/v/[vin]` for a
--     bounded window — no account required.
--   - Reads/writes happen only via the service-role server layer
--     (anonymous buyers never touch these tables directly), so
--     RLS is service-role only, mirroring `vehicle_passports`.
-- =============================================================

-- -------------------------------------------------------------
-- vehicle_report_settings : platform-wide singleton pricing
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_report_settings (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  price_jpy   integer NOT NULL DEFAULT 3000
                CHECK (price_jpy >= 100 AND price_jpy <= 1000000),
  enabled     boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed the singleton row (default ¥3,000, enabled).
INSERT INTO vehicle_report_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE vehicle_report_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_report_settings_service_role_all" ON vehicle_report_settings;
CREATE POLICY "vehicle_report_settings_service_role_all" ON vehicle_report_settings
  FOR ALL USING (auth.role() = 'service_role');

-- -------------------------------------------------------------
-- vehicle_report_orders : one row per purchase (account-less)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle_report_orders (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The passport this report unlocks (normalized VIN).
  vin_code_normalized         text NOT NULL,

  -- The /c/[public_id] the buyer came from (audit / funnel only).
  source_public_id            text,

  -- Random opaque token; grants access to /v/[vin] without login.
  access_token                text NOT NULL UNIQUE,

  status                      text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'expired')),

  -- Price charged (snapshot of vehicle_report_settings at checkout).
  amount_jpy                  integer NOT NULL,

  stripe_checkout_session_id  text UNIQUE,
  stripe_payment_intent_id    text,

  paid_at                     timestamptz,
  -- Access validity window after payment (set on webhook success).
  expires_at                  timestamptz,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_report_orders_vin
  ON vehicle_report_orders (vin_code_normalized);

-- Access check hot path: token + status + expiry.
CREATE INDEX IF NOT EXISTS idx_vehicle_report_orders_token
  ON vehicle_report_orders (access_token);

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION touch_vehicle_report_orders_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$;

DROP TRIGGER IF EXISTS trg_vehicle_report_orders_touch_updated_at ON vehicle_report_orders;
CREATE TRIGGER trg_vehicle_report_orders_touch_updated_at
  BEFORE UPDATE ON vehicle_report_orders
  FOR EACH ROW
  EXECUTE FUNCTION touch_vehicle_report_orders_updated_at();

ALTER TABLE vehicle_report_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_report_orders_service_role_all" ON vehicle_report_orders;
CREATE POLICY "vehicle_report_orders_service_role_all" ON vehicle_report_orders
  FOR ALL USING (auth.role() = 'service_role');
