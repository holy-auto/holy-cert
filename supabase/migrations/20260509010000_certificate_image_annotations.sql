-- =============================================================
-- Phase 2: 写真 Image Markup
-- certificate_images に注釈データ・焼き込み済み画像のメタを追加
-- =============================================================
-- 設計メモ:
--   - 注釈 (annotations) はクライアントが Konva で作成し、JSON で保存。
--     座標は元画像のピクセル空間で正規化。
--   - rendered_storage_path は SVG 焼き込み版の Storage パス。
--     原本（storage_path）はアンカリング根拠として不変のまま残す。
--   - annotated_by は記録目的で nullable (RLS 経由で書き手の同意は取る)。
--
-- 部分インデックスは CONCURRENTLY で別ファイルに分離している:
--   20260509010001_certificate_image_annotations_index.sql

ALTER TABLE certificate_images
  ADD COLUMN IF NOT EXISTS annotations            jsonb,
  ADD COLUMN IF NOT EXISTS annotated_at           timestamptz,
  ADD COLUMN IF NOT EXISTS annotated_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rendered_storage_path  text,
  ADD COLUMN IF NOT EXISTS rendered_at            timestamptz;
