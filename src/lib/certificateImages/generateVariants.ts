/**
 * Generate WebP variants (thumbnail + medium) of a certificate image
 * so the LCP-critical paths can serve compact derivatives instead of the
 * full original. Best-effort: a failure here MUST NOT block the upload —
 * the original is still stored and the row is still inserted; only the
 * variant fields stay NULL.
 *
 * Output spec:
 *   - thumbnail: max width 400px, longest-edge fit, WebP q=78
 *   - medium:    max width 1200px, longest-edge fit, WebP q=82
 *
 * Roadmap: docs/architecture-roadmap.md §9.3
 *   1. ✅ generate-on-upload (this file)
 *   2. ⏳ backfill cron for existing rows where variant_path IS NULL
 *   3. ⏳ Vercel <Image src=variant ?: original /> wiring in admin/customer UI
 *   4. ⏳ Cache-Control optimization for the storage bucket
 */

import sharp from "sharp";
import { logger } from "@/lib/logger";

export interface ImageVariant {
  buffer: Buffer;
  contentType: "image/webp";
  width: number;
  height: number;
  byteLength: number;
}

export interface GeneratedVariants {
  thumbnail: ImageVariant | null;
  medium: ImageVariant | null;
}

interface VariantSpec {
  maxWidth: number;
  quality: number;
  label: "thumbnail" | "medium";
}

const SPECS: VariantSpec[] = [
  { label: "thumbnail", maxWidth: 400, quality: 78 },
  { label: "medium", maxWidth: 1200, quality: 82 },
];

/**
 * Build a single WebP variant. Returns null on failure (best-effort).
 *
 * `sharp().resize({ width, withoutEnlargement: true })` only downscales —
 * an already-small image is returned at its original dimensions, just
 * re-encoded as WebP for consistency with the variant suffix.
 */
async function buildVariant(source: Buffer, spec: VariantSpec): Promise<ImageVariant | null> {
  try {
    const pipeline = sharp(source, { failOn: "none" })
      .rotate() // honor EXIF orientation; EXIF has already been stripped
      //   for privacy but the orientation tag is applied before strip
      .resize({ width: spec.maxWidth, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: spec.quality });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      contentType: "image/webp",
      width: info.width,
      height: info.height,
      byteLength: data.length,
    };
  } catch (err) {
    logger.warn("certificate image variant generation failed", {
      label: spec.label,
      maxWidth: spec.maxWidth,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function generateImageVariants(source: Buffer): Promise<GeneratedVariants> {
  // Run the two encodes in parallel — they share no state and sharp
  // releases the GIL between operations so concurrency is fine.
  const [thumbnail, medium] = await Promise.all(SPECS.map((s) => buildVariant(source, s)));
  return { thumbnail, medium };
}

/**
 * Build a sibling storage path for a variant. Given the original
 * `<tenant>/<cert>/<ts>_<i>.jpg`, we want `<tenant>/<cert>/<ts>_<i>.thumb.webp`
 * (or `.md.webp`). Variant suffix is inserted *before* the final extension
 * so the bucket listing visibly groups the family together.
 */
export function variantStoragePath(originalPath: string, label: "thumbnail" | "medium"): string {
  const suffix = label === "thumbnail" ? "thumb" : "md";
  // Strip the trailing extension (last `.xxx`) and append `.<suffix>.webp`.
  const lastDot = originalPath.lastIndexOf(".");
  const base = lastDot > 0 ? originalPath.slice(0, lastDot) : originalPath;
  return `${base}.${suffix}.webp`;
}
