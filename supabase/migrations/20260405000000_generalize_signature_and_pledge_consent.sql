-- ============================================================
-- 電子署名の汎用化 & 誓約書・同意書の帳票種別追加
--
-- 1. signature_sessions を証明書専用から汎用文書対応に拡張
-- 2. documents テーブルに pledge（誓約書）・consent（同意書）を追加
-- ============================================================

-- ============================================================
-- 1. signature_sessions の汎用化
--    document_id + document_type を追加し、certificate_id を nullable に
-- ============================================================

-- 汎用文書参照カラムを追加
ALTER TABLE signature_sessions
  ADD COLUMN IF NOT EXISTS document_id   UUID,
  ADD COLUMN IF NOT EXISTS document_type TEXT;

-- certificate_id を nullable に変更
ALTER TABLE signature_sessions
  ALTER COLUMN certificate_id DROP NOT NULL;

-- 既存レコードの document_id / document_type をバックフィル
UPDATE signature_sessions
SET document_id   = certificate_id,
    document_type = 'certificate'
WHERE document_id IS NULL
  AND certificate_id IS NOT NULL;

-- document_type の CHECK 制約
DO $$ BEGIN
  ALTER TABLE signature_sessions
    ADD CONSTRAINT chk_signature_sessions_document_type
    CHECK (document_type IN ('certificate', 'document'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 少なくとも document_id または certificate_id が設定されていること
DO $$ BEGIN
  ALTER TABLE signature_sessions
    ADD CONSTRAINT chk_signature_sessions_has_target
    CHECK (document_id IS NOT NULL OR certificate_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_signature_sessions_document_id
  ON signature_sessions(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_sessions_document_type
  ON signature_sessions(document_type);


-- ============================================================
-- 2. documents テーブルに pledge / consent を追加
--    CHECK 制約を差し替える
-- ============================================================

-- 既存の CHECK 制約を削除（名前は PostgreSQL 自動生成のため探索で削除）
DO $$
DECLARE
  cname TEXT;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = rel.relnamespace
  WHERE rel.relname = 'documents'
    AND ns.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%doc_type%';

  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE documents DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

-- 新しい CHECK 制約を追加（pledge / consent を含む）
ALTER TABLE documents
  ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN (
    'estimate',
    'delivery',
    'purchase_order',
    'order_confirmation',
    'inspection',
    'receipt',
    'invoice',
    'consolidated_invoice',
    'pledge',
    'consent'
  ));

-- ============================================================
-- 3. コメント更新
-- ============================================================
COMMENT ON COLUMN signature_sessions.document_id IS
  '汎用文書ID。certificates.id または documents.id を格納する。';

COMMENT ON COLUMN signature_sessions.document_type IS
  '文書種別。"certificate" = certificates テーブル、"document" = documents テーブル。';
