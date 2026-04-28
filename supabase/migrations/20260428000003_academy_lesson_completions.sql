-- ============================================================
-- Academy 学習進捗: レッスン完了の記録
-- - lesson × user UNIQUE で重複完了を防止
-- - 完了時に academy_progress を集約更新するトリガー
-- - スコアはレッスン level に応じて API 側で計算 (intro=10, basic=20, standard=30, pro=50)
--
-- インデックスは別マイグレーション (CONCURRENTLY)
-- ============================================================

-- 既存 academy_progress に lessons_completed カラムを追加
ALTER TABLE academy_progress
  ADD COLUMN IF NOT EXISTS lessons_completed int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS academy_lesson_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id    uuid NOT NULL REFERENCES academy_lessons(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  tenant_id    uuid NOT NULL,
  score_earned int  NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);

-- 完了集計を academy_progress に反映
CREATE OR REPLACE FUNCTION refresh_academy_progress_on_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_user   uuid := COALESCE(NEW.user_id, OLD.user_id);
  target_tenant uuid := COALESCE(NEW.tenant_id, OLD.tenant_id);
  v_total_score int;
  v_lessons_completed int;
BEGIN
  IF target_tenant IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(score_earned), 0), COUNT(*)
    INTO v_total_score, v_lessons_completed
    FROM academy_lesson_completions
    WHERE user_id = target_user;

  INSERT INTO academy_progress (
    tenant_id, user_id, total_score, lessons_completed, last_activity_at, updated_at
  )
  VALUES (target_tenant, target_user, v_total_score, v_lessons_completed, now(), now())
  ON CONFLICT (tenant_id, user_id)
  DO UPDATE SET
    total_score       = EXCLUDED.total_score,
    lessons_completed = EXCLUDED.lessons_completed,
    last_activity_at  = EXCLUDED.last_activity_at,
    updated_at        = EXCLUDED.updated_at;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_academy_progress_on_completion ON academy_lesson_completions;
CREATE TRIGGER trg_refresh_academy_progress_on_completion
  AFTER INSERT OR DELETE ON academy_lesson_completions
  FOR EACH ROW EXECUTE FUNCTION refresh_academy_progress_on_completion();

-- RLS
ALTER TABLE academy_lesson_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academy_lesson_completions_select_own" ON academy_lesson_completions;
DROP POLICY IF EXISTS "academy_lesson_completions_insert_own" ON academy_lesson_completions;
DROP POLICY IF EXISTS "academy_lesson_completions_delete_own" ON academy_lesson_completions;

CREATE POLICY "academy_lesson_completions_select_own" ON academy_lesson_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "academy_lesson_completions_insert_own" ON academy_lesson_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM academy_lessons WHERE id = lesson_id AND status = 'published')
  );

CREATE POLICY "academy_lesson_completions_delete_own" ON academy_lesson_completions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
