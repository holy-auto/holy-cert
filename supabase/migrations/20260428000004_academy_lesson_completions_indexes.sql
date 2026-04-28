-- ============================================================
-- Academy レッスン完了テーブル用インデックス (CONCURRENTLY)
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lesson_completions_user
  ON academy_lesson_completions (user_id, completed_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lesson_completions_lesson
  ON academy_lesson_completions (lesson_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lesson_completions_tenant
  ON academy_lesson_completions (tenant_id, completed_at DESC);
