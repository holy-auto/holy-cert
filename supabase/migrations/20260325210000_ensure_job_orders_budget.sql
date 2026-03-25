-- =============================================================
-- job_orders: budget カラムが存在することを保証
-- PostgREST スキーマキャッシュ問題の解決
-- =============================================================

-- budget カラムが存在しない場合に追加（安全なべき等操作）
ALTER TABLE job_orders
  ADD COLUMN IF NOT EXISTS budget numeric;

-- PostgREST のスキーマキャッシュをリロード
NOTIFY pgrst, 'reload schema';
