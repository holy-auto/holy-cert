-- WebP variants on certificate_images.
--
-- Roadmap §9.3: serve LCP-critical paths (admin gallery / customer
-- portal / public cert page) a compact derivative instead of the full
-- original. Two variants:
--   thumbnail_path: ≤400px wide WebP
--   medium_path:    ≤1200px wide WebP
--
-- Variants are generated synchronously in the upload route (see
-- `generateImageVariants()`); when sharp fails the columns stay NULL
-- and consumers fall back to the original `storage_path`. A backfill
-- cron for older rows is planned but not in this migration.

ALTER TABLE certificate_images
  ADD COLUMN IF NOT EXISTS thumbnail_path text,
  ADD COLUMN IF NOT EXISTS medium_path    text;

COMMENT ON COLUMN certificate_images.thumbnail_path IS
  'Storage path to a ≤400px wide WebP variant generated on upload. NULL when sharp failed or the row predates the variant pipeline (backfill cron planned).';
COMMENT ON COLUMN certificate_images.medium_path IS
  'Storage path to a ≤1200px wide WebP variant. Same NULL semantics as thumbnail_path.';
