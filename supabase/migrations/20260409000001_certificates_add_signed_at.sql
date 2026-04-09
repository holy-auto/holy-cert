-- certificates テーブルに電子署名完了日時カラムを追加
-- regenerateSignedPdf が署名完了を記録するために使用する

ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

COMMENT ON COLUMN certificates.signed_at
  IS '電子署名が完了した日時。NULL の場合は未署名。signature_sessions テーブルと連動。';
