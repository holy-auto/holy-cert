/**
 * アップロードファイルのマジックバイト検証。
 *
 * Content-Type ヘッダはクライアント任意のため、`image/jpeg` と申告された
 * ファイルが実は HTML / SVG / EXE という偽装攻撃 (MIME confusion / file
 * polyglot) を防ぐ。先頭バイト列を確認して allowlist の MIME 種別と
 * 一致することを検証する。
 *
 * 想定用途:
 *   const buf = Buffer.from(await file.arrayBuffer());
 *   const result = validateFileMagic(buf, ["image/jpeg", "image/png", "image/webp", "application/pdf"]);
 *   if (!result.ok) return apiError({ code: "validation_error", ... });
 *
 * SVG は画像系 MIME に偽装した XSS payload の温床なので画像 allowlist には
 * 含めない方針。どうしても許可したい場合は別関数で svg-purifier を通すこと。
 */

export type DetectedMime =
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "image/avif"
  | "application/pdf"
  | "application/zip"
  | "video/mp4"
  | "video/quicktime"
  | "unknown";

/** 先頭バイト列から MIME を推定する。 */
export function detectMime(buf: Buffer | Uint8Array): DetectedMime {
  const b = buf instanceof Uint8Array ? buf : Buffer.from(buf);
  if (b.length < 4) return "unknown";

  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";

  // GIF: 47 49 46 38 (GIF8)
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";

  // PDF: 25 50 44 46 (%PDF)
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";

  // RIFF (WebP): 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 (WEBP)
  if (
    b.length >= 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }

  // ISO BMFF (HEIC / HEIF / AVIF / MP4 / MOV): bytes 4-7 = "ftyp"
  if (b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    const brand = b.subarray(8, 12).toString("ascii");
    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") return "image/heic";
    if (brand === "mif1" || brand === "msf1" || brand === "heim" || brand === "heis") return "image/heif";
    if (brand === "avif" || brand === "avis") return "image/avif";
    if (brand === "qt  ") return "video/quicktime";
    // mp4 / iso2 / isom 等は動画
    if (
      brand === "mp41" ||
      brand === "mp42" ||
      brand === "isom" ||
      brand === "iso2" ||
      brand === "iso5" ||
      brand === "M4V " ||
      brand === "MP4 "
    ) {
      return "video/mp4";
    }
  }

  // ZIP / DOCX / XLSX (Office Open XML はすべて ZIP): 50 4B 03 04
  if (b[0] === 0x50 && b[1] === 0x4b && (b[2] === 0x03 || b[2] === 0x05) && (b[3] === 0x04 || b[3] === 0x06)) {
    return "application/zip";
  }

  return "unknown";
}

export type FileValidationResult =
  | { ok: true; mime: DetectedMime }
  | { ok: false; reason: string; detected?: DetectedMime };

/**
 * マジックバイト検証 + サイズ上限。
 * @param buf  ファイル本体
 * @param allowedMimes  許可する MIME 一覧
 * @param maxBytes  サイズ上限 (デフォルト 25 MB)
 */
export function validateFileMagic(
  buf: Buffer | Uint8Array,
  allowedMimes: readonly DetectedMime[],
  maxBytes: number = 25 * 1024 * 1024,
): FileValidationResult {
  if (!buf || buf.length === 0) return { ok: false, reason: "empty_file" };
  if (buf.length > maxBytes) return { ok: false, reason: `file_too_large:${buf.length}` };
  const detected = detectMime(buf);
  if (detected === "unknown") return { ok: false, reason: "unknown_mime" };
  if (!allowedMimes.includes(detected)) {
    return { ok: false, reason: `mime_not_allowed:${detected}`, detected };
  }
  return { ok: true, mime: detected };
}

/**
 * Path traversal を含むファイル名を弾く。
 * ストレージキーにユーザー入力ファイル名を埋める前に必ず通す。
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\\/g, "_") // backslash
    .replace(/\//g, "_") // forward slash
    .replace(/\0/g, "") // NUL byte
    .replace(/\.\.+/g, "_") // double dots
    .replace(/^\./, "_") // leading dot (hidden file)
    .replace(/[\x00-\x1f\x7f]/g, "_") // control chars
    .slice(0, 255);
}
