-- polygon_backfill_jobs: ブロックチェーン・バックフィルの非同期ジョブ管理
CREATE TABLE IF NOT EXISTS polygon_backfill_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  -- status: queued → processing → completed → failed
  total_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX polygon_backfill_jobs_tenant_id_idx ON polygon_backfill_jobs(tenant_id);
CREATE INDEX polygon_backfill_jobs_status_idx ON polygon_backfill_jobs(status);

ALTER TABLE polygon_backfill_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view their backfill jobs"
  ON polygon_backfill_jobs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships
      WHERE user_id = auth.uid()
    )
  );
