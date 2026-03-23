-- テナントに gcal_last_synced_at カラムを追加（最終同期日時を記録）
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS gcal_last_synced_at timestamptz;
