-- Add missing columns to certificates table that public-status and other routes SELECT
-- These were added in various migrations that may not have been applied

ALTER TABLE certificates
  -- from 20260313000000_add_service_price_and_customers
  ADD COLUMN IF NOT EXISTS service_price        bigint,
  ADD COLUMN IF NOT EXISTS customer_id          uuid REFERENCES customers(id),

  -- from 20260315000001_follow_up
  ADD COLUMN IF NOT EXISTS expiry_date          date,

  -- from 20260317000007_stores
  ADD COLUMN IF NOT EXISTS store_id             uuid,

  -- from 20260321000000_brands_coating_products
  ADD COLUMN IF NOT EXISTS coating_products_json jsonb DEFAULT '[]'::jsonb,

  -- from 20260322000000_cert_expiry_warranty
  ADD COLUMN IF NOT EXISTS warranty_period_end  date,

  -- from 20260322000001_cert_rebuild
  ADD COLUMN IF NOT EXISTS maintenance_date     date,
  ADD COLUMN IF NOT EXISTS warranty_exclusions  text,
  ADD COLUMN IF NOT EXISTS remarks              text,

  -- from 20260322000006_ppf_support
  ADD COLUMN IF NOT EXISTS ppf_coverage_json    jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS service_type         text  DEFAULT 'coating',

  -- from 20260323060000_pos_extensions
  ADD COLUMN IF NOT EXISTS reservation_id       uuid,
  ADD COLUMN IF NOT EXISTS payment_id           uuid,

  -- from 20260323110000_maintenance_bodyrepair_templates
  ADD COLUMN IF NOT EXISTS maintenance_json     jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS body_repair_json     jsonb DEFAULT '{}'::jsonb,

  -- from 20260325000001_mobile_support
  ADD COLUMN IF NOT EXISTS parent_certificate_id uuid REFERENCES certificates(id);
