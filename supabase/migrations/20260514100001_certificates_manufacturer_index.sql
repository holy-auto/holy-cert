-- Partial index for certificates.manufacturer_id lookups.
--
-- Manufacturer-issued certificates are a minority of total rows
-- (only certified contractors set this column), so a partial
-- index keeps the structure small while still serving the
-- "list certificates issued under manufacturer X" admin view.
--
-- CONCURRENTLY because certificates is a hot write table.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certs_manufacturer
  ON certificates (manufacturer_id)
  WHERE manufacturer_id IS NOT NULL;
