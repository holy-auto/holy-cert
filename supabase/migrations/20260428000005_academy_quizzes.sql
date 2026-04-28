-- ============================================================
-- Academy クイズ: 理解度チェック (多肢選択)
-- - 質問は lesson に紐づき position で順序付け
-- - 採点はサーバー側で行い、70% 以上で合格 → lesson 完了を自動マーク
--
-- インデックスは別マイグレーション (CONCURRENTLY)
-- ============================================================

CREATE TABLE IF NOT EXISTS academy_quiz_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  position      int  NOT NULL DEFAULT 0,
  question      text NOT NULL,
  choices       text[] NOT NULL,
  correct_index int  NOT NULL CHECK (correct_index >= 0),
  explanation   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (cardinality(choices) BETWEEN 2 AND 6),
  CHECK (correct_index < cardinality(choices))
);

CREATE TABLE IF NOT EXISTS academy_quiz_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id     uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  tenant_id     uuid NOT NULL,
  score         int  NOT NULL DEFAULT 0,    -- 正解数
  total         int  NOT NULL DEFAULT 0,    -- 総問題数
  passed        bool NOT NULL DEFAULT false,
  answers       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{question_id, selected_index, is_correct}]
  attempted_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE academy_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_quiz_attempts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academy_quiz_questions_select_published"   ON academy_quiz_questions;
DROP POLICY IF EXISTS "academy_quiz_questions_select_author"      ON academy_quiz_questions;
DROP POLICY IF EXISTS "academy_quiz_questions_write_author"       ON academy_quiz_questions;

-- 公開レッスンの質問は閲覧可能 (correct_index/explanation は API 層で参加者向けに隠す)
CREATE POLICY "academy_quiz_questions_select_published" ON academy_quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM academy_lessons l
    WHERE l.id = lesson_id AND l.status = 'published'
  ));

-- 作者・super_admin は下書きを含めて読める
CREATE POLICY "academy_quiz_questions_select_author" ON academy_quiz_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM academy_lessons l
    WHERE l.id = lesson_id
      AND (l.author_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin'))
  ));

-- 質問の追加/更新/削除は作者・super_admin のみ
CREATE POLICY "academy_quiz_questions_write_author" ON academy_quiz_questions
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM academy_lessons l
    WHERE l.id = lesson_id
      AND (l.author_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM academy_lessons l
    WHERE l.id = lesson_id
      AND (l.author_user_id = auth.uid()
           OR EXISTS (SELECT 1 FROM tenant_memberships WHERE user_id = auth.uid() AND role = 'super_admin'))
  ));

DROP POLICY IF EXISTS "academy_quiz_attempts_select_own" ON academy_quiz_attempts;
DROP POLICY IF EXISTS "academy_quiz_attempts_insert_own" ON academy_quiz_attempts;

CREATE POLICY "academy_quiz_attempts_select_own" ON academy_quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "academy_quiz_attempts_insert_own" ON academy_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM academy_lessons WHERE id = lesson_id AND status = 'published')
  );
