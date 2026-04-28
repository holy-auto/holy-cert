-- ============================================================
-- Ledra Academy オンライン学習: レッスン教材 + 評価
-- - tenant_id IS NULL = 運営(プラットフォーム)コンテンツ
-- - tenant_id 設定 = 加盟店投稿
-- - level = 'intro' は Free でも閲覧可、それ以外は Starter+
--
-- インデックスは別マイグレーション (CONCURRENTLY)
-- ============================================================

CREATE TABLE IF NOT EXISTS academy_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid REFERENCES tenants(id) ON DELETE SET NULL,
  author_user_id  uuid,
  category        text NOT NULL,
  level           text NOT NULL DEFAULT 'basic'
    CHECK (level IN ('intro','basic','standard','pro')),
  difficulty      int  NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  title           text NOT NULL,
  summary         text,
  body            text NOT NULL DEFAULT '',
  video_url       text,
  cover_image_url text,
  tags            text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  published_at    timestamptz,
  view_count      int NOT NULL DEFAULT 0,
  rating_avg      numeric(3,2) NOT NULL DEFAULT 0,
  rating_count    int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 評価
CREATE TABLE IF NOT EXISTS academy_lesson_ratings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id   uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  tenant_id   uuid,
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

-- 評価を集約してレッスンに反映するトリガー
CREATE OR REPLACE FUNCTION refresh_academy_lesson_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_id uuid := COALESCE(NEW.lesson_id, OLD.lesson_id);
  v_avg numeric(3,2);
  v_count int;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::numeric(3,2), COUNT(*)
    INTO v_avg, v_count
    FROM academy_lesson_ratings
    WHERE lesson_id = target_id;

  UPDATE academy_lessons
    SET rating_avg = v_avg,
        rating_count = v_count,
        updated_at = now()
    WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_academy_lesson_rating ON academy_lesson_ratings;
CREATE TRIGGER trg_refresh_academy_lesson_rating
  AFTER INSERT OR UPDATE OR DELETE ON academy_lesson_ratings
  FOR EACH ROW EXECUTE FUNCTION refresh_academy_lesson_rating();

-- RLS
ALTER TABLE academy_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_lesson_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academy_lessons_select_published"  ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_select_own_tenant" ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_insert"            ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_update_author"     ON academy_lessons;
DROP POLICY IF EXISTS "academy_lessons_delete_author"     ON academy_lessons;

-- 公開済みは認証済みユーザーが閲覧可能 (プラン制限はAPI層で実施)
CREATE POLICY "academy_lessons_select_published" ON academy_lessons
  FOR SELECT
  TO authenticated
  USING (status = 'published');

-- 自テナント or 自身が作者の下書きを閲覧可能
CREATE POLICY "academy_lessons_select_own_tenant" ON academy_lessons
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid())
    OR author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 投稿: 自テナントに紐づく投稿、または super_admin が運営コンテンツ (tenant_id IS NULL) を作成可能
CREATE POLICY "academy_lessons_insert" ON academy_lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (tenant_id IN (SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()))
    OR (tenant_id IS NULL AND EXISTS (
      SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin'
    ))
  );

-- 更新: 作者本人 or super_admin
CREATE POLICY "academy_lessons_update_author" ON academy_lessons
  FOR UPDATE
  TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin')
  )
  WITH CHECK (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 削除: 作者本人 or super_admin
CREATE POLICY "academy_lessons_delete_author" ON academy_lessons
  FOR DELETE
  TO authenticated
  USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 評価: 認証ユーザーは公開レッスンを評価可能、自分の評価のみ更新削除可
DROP POLICY IF EXISTS "academy_lesson_ratings_select" ON academy_lesson_ratings;
DROP POLICY IF EXISTS "academy_lesson_ratings_insert" ON academy_lesson_ratings;
DROP POLICY IF EXISTS "academy_lesson_ratings_update_own" ON academy_lesson_ratings;
DROP POLICY IF EXISTS "academy_lesson_ratings_delete_own" ON academy_lesson_ratings;

CREATE POLICY "academy_lesson_ratings_select" ON academy_lesson_ratings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "academy_lesson_ratings_insert" ON academy_lesson_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM academy_lessons WHERE id = lesson_id AND status = 'published')
  );

CREATE POLICY "academy_lesson_ratings_update_own" ON academy_lesson_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "academy_lesson_ratings_delete_own" ON academy_lesson_ratings
  FOR DELETE TO authenticated USING (user_id = auth.uid());
