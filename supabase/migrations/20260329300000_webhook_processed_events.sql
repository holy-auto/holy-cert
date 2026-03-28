-- Generic webhook idempotency table for Square, CloudSign, and other webhook sources.
-- Prevents duplicate processing when external services retry delivery.

CREATE TABLE IF NOT EXISTS webhook_processed_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id      text NOT NULL UNIQUE,
  source        text NOT NULL,           -- e.g. 'square', 'cloudsign'
  processed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wpe_event_id ON webhook_processed_events (event_id);
CREATE INDEX IF NOT EXISTS idx_wpe_processed_at ON webhook_processed_events (processed_at);

COMMENT ON TABLE webhook_processed_events IS 'Webhook idempotency for Square, CloudSign, etc. Rows older than 90 days can be safely deleted.';

-- RLS: service role only (webhooks use service role / admin client)
ALTER TABLE webhook_processed_events ENABLE ROW LEVEL SECURITY;
