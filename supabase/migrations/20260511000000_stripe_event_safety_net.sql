-- Stripe webhook safety-net columns
--
-- We already deduplicate event delivery via stripe_processed_events. This
-- migration adds the columns we need for the *replay* half of the contract:
-- when Stripe sends us an event, we claim the idempotency row AND store the
-- raw payload. If the inline switch in /api/stripe/webhook crashes part-way
-- (or the route times out), the cron /api/cron/stripe-event-monitor can
-- detect rows where processed_at IS NULL well past the claim time and alert
-- ops to manually re-deliver via the Stripe dashboard.
--
-- Forward path (Phase 2): a worker can read `payload` from these rows and
-- re-invoke the processor without depending on Stripe's resend mechanism.
-- This migration ships the data plane; the worker side is a separate PR.
--
-- Privacy: `payload` may contain customer emails / amounts; never log it.
-- Rows older than 30 days should be purged of `payload` to limit exposure.

ALTER TABLE stripe_processed_events
  ADD COLUMN IF NOT EXISTS payload          jsonb,
  ADD COLUMN IF NOT EXISTS processed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS error_message    text,
  ADD COLUMN IF NOT EXISTS attempts         int NOT NULL DEFAULT 0;

COMMENT ON COLUMN stripe_processed_events.payload IS
  'Raw Stripe event JSON, captured at claim time so a stuck event can be replayed without depending on Stripe resend. PII — purge after 30d.';
COMMENT ON COLUMN stripe_processed_events.processed_at IS
  'Set by the webhook route at the end of inline processing. NULL after a few minutes => the event is stuck; monitor cron will alert.';
COMMENT ON COLUMN stripe_processed_events.error_message IS
  'Last error captured during inline processing. NULL when processing has not started or completed successfully.';
COMMENT ON COLUMN stripe_processed_events.attempts IS
  'Number of replay attempts so far (0 = first/inline attempt).';

-- NOTE: the partial index on (created_at) WHERE processed_at IS NULL — used
-- by the monitor cron to scan only stuck rows — is created in the sibling
-- migration 20260511000001_stripe_event_safety_net_index.sql with
-- CREATE INDEX CONCURRENTLY (lint rule: cannot run inside a transaction).
