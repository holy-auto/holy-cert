-- =============================================================
-- Phase 2: 写真 Image Markup
-- "注釈付き画像のみ" を引きやすくするための部分インデックス
-- =============================================================
-- CONCURRENTLY を使うためトランザクション外で実行されること。
-- カラム追加 (20260509010000_certificate_image_annotations.sql) は
-- 既に流れている前提。

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certimg_annotated
  ON certificate_images (certificate_id)
  WHERE annotations IS NOT NULL;
