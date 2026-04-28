-- ============================================================
-- Academy クイズ用インデックス (CONCURRENTLY)
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_quiz_questions_lesson
  ON academy_quiz_questions (lesson_id, position);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_quiz_attempts_lesson_user
  ON academy_quiz_attempts (lesson_id, user_id, attempted_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_quiz_attempts_user
  ON academy_quiz_attempts (user_id, attempted_at DESC);
