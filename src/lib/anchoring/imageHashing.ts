import crypto from "crypto";

/**
 * Cryptographic + perceptual hashing for certificate images.
 *
 * SHA-256 covers tamper detection (any byte change flips the hash).
 * The perceptual hash (aHash, 64 bits) survives recompression and
 * minor edits, so we can spot the same photo re-uploaded under a
 * different grade or certificate.
 *
 * Phase 1 intentionally uses an in-house aHash via sharp rather than
 * an external pHash library, to keep the dependency footprint small.
 */

/** Returns the lowercase 64-char hex SHA-256 of `buffer`. */
export function hashSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compute a 64-bit average-hash (aHash) of the image.
 * Returns a 16-char lowercase hex string.
 *
 * Algorithm: resize to 8x8 grayscale, threshold each pixel against
 * the mean. Each bit = 1 if pixel >= mean, else 0.
 */
export async function computePerceptualHash(buffer: Buffer): Promise<string> {
  // Dynamic import so unit tests that don't touch images don't pay
  // the sharp native-binding startup cost.
  const sharp = (await import("sharp")).default;

  const { data } = await sharp(buffer)
    .rotate() // honour EXIF orientation before hashing
    .grayscale()
    .resize(8, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (data.length < 64) {
    // Shouldn't happen, but bail out safely rather than emit a bad hash.
    return "0000000000000000";
  }

  let sum = 0;
  for (let i = 0; i < 64; i++) sum += data[i];
  const mean = sum / 64;

  let hi = 0; // upper 32 bits
  let lo = 0; // lower 32 bits
  for (let i = 0; i < 32; i++) {
    if (data[i] >= mean) hi |= 1 << (31 - i);
  }
  for (let i = 0; i < 32; i++) {
    if (data[32 + i] >= mean) lo |= 1 << (31 - i);
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return toHex(hi) + toHex(lo);
}
