-- =============================================================
-- job_orders: 全カラムの NOT NULL 制約を動的に正規化
-- DB上に手動追加されたカラムも含め、必須カラム以外の
-- NOT NULL を一括で除去する
-- =============================================================

DO $$
DECLARE
  col record;
  -- 本当に NOT NULL であるべきカラムのみ列挙
  required_cols text[] := ARRAY['id', 'from_tenant_id', 'title', 'status'];
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'job_orders'
      AND is_nullable = 'NO'
      AND column_name != ALL(required_cols)
  LOOP
    RAISE NOTICE 'Dropping NOT NULL from job_orders.%', col.column_name;
    EXECUTE format('ALTER TABLE job_orders ALTER COLUMN %I DROP NOT NULL', col.column_name);
  END LOOP;
END $$;
