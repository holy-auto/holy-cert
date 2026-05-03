-- =============================================================================
-- Academy lessons: video provider 抽象化
--
-- 動画ストリーミングを Supabase Storage に置かず外部 provider に分離する。
-- 初期は Cloudflare Stream を使用するが、将来 Mux に切り替える可能性がある
-- ため、provider-agnostic なメタデータ列のみ追加する。
--
--   video_provider           : 'cloudflare' | 'mux' | 'youtube' | 'external'
--   video_asset_id           : provider 内部 ID (CFS の uid, Mux の asset id)
--   video_playback_id        : 公開再生 ID (CFS の uid と同じ場合あり、
--                              Mux は playback_id が別)
--   video_status             : 'pending' | 'ready' | 'errored'
--                              webhook で 'ready' に更新される
--   video_duration_sec       : 再生時間。完了判定の閾値計算に使用
--   video_provider_metadata  : provider 固有の付帯データ
--                              (CFS: thumbnail / Mux: policy 等)
--
-- 既存の academy_lessons.video_url は後方互換のため残す (external provider 用)。
-- 新規 lesson は upload エンドポイント経由で provider にアップロードされ、
-- video_provider + video_playback_id が埋まる。
--
-- Zero-downtime: 全カラム NULLABLE で追加 (default 値あり / なし問わず)。
-- =============================================================================

ALTER TABLE academy_lessons
  ADD COLUMN IF NOT EXISTS video_provider text
    CHECK (video_provider IS NULL OR video_provider IN ('cloudflare', 'mux', 'youtube', 'external')),
  ADD COLUMN IF NOT EXISTS video_asset_id text,
  ADD COLUMN IF NOT EXISTS video_playback_id text,
  ADD COLUMN IF NOT EXISTS video_status text
    CHECK (video_status IS NULL OR video_status IN ('pending', 'ready', 'errored')),
  ADD COLUMN IF NOT EXISTS video_duration_sec int CHECK (video_duration_sec IS NULL OR video_duration_sec >= 0),
  ADD COLUMN IF NOT EXISTS video_provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- provider と asset_id の組で一意 (同じ asset を複数 lesson に紐付けない)
-- video_provider が NULL の行は対象外。
CREATE UNIQUE INDEX IF NOT EXISTS uq_academy_lessons_provider_asset
  ON academy_lessons (video_provider, video_asset_id)
  WHERE video_provider IS NOT NULL AND video_asset_id IS NOT NULL;

-- webhook が ready を反映するときの lookup 用 (status 別カウント / 検索)
CREATE INDEX IF NOT EXISTS idx_academy_lessons_video_status
  ON academy_lessons (video_status)
  WHERE video_status IS NOT NULL;
