-- ============================================================
-- Academy レッスン用インデックス (CONCURRENTLY)
-- 別ファイルにする理由: CREATE INDEX CONCURRENTLY はトランザクション内で
-- 実行できないため、Supabase が各マイグレーションをトランザクションで包む
-- 都合上、テーブル作成とは別ファイルに分離する必要がある。
-- ============================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lessons_status_level
  ON academy_lessons (status, level, published_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lessons_category
  ON academy_lessons (category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lessons_tenant
  ON academy_lessons (tenant_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lessons_rating
  ON academy_lessons (rating_avg DESC) WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_academy_lesson_ratings_lesson
  ON academy_lesson_ratings (lesson_id);
