-- Partial index for the stripe-event-monitor cron.
--
-- Only stuck rows (processed_at IS NULL) are interesting; a full index on
-- processed_at would bloat for the >99% of rows that complete successfully.
--
-- CONCURRENTLY because the table is hot (every Stripe webhook claims a row);
-- a blocking ACCESS EXCLUSIVE lock here would briefly hang webhook ingestion.
-- Must run outside a transaction → standalone migration.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spe_processed_at_null
  ON stripe_processed_events (created_at)
  WHERE processed_at IS NULL;
