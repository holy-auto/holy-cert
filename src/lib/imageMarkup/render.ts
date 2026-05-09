/**
 * Phase 2: Image Markup
 * sharp を使って原画像 + SVG オーバーレイ → 焼き込み済み画像 (Buffer) を返す。
 *
 * - 原画像はバッファとして既に取得済みであることを期待する。
 *   (Storage からの fetch は呼び出し側 = API ルート側の責務。)
 * - 出力フォーマットは原画像を保つ。HEIC は JPEG に正規化する。
 *   sharp は HEIC の write をサポートしないため、PDF 等下流互換の意図もある。
 * - メタデータ (EXIF) は付けない。原本側で既にストリップ済み。
 */

import type { AnnotationDocument } from "@/components/imageMarkup/types";
import { annotationsToSvg } from "./toSvg";

/** 入力 MIME → 出力 MIME のマッピング。HEIC は JPEG に変換する。 */
function pickOutputMime(inputMime: string): "image/jpeg" | "image/png" | "image/webp" {
  const m = inputMime.toLowerCase();
  if (m === "image/png") return "image/png";
  if (m === "image/webp") return "image/webp";
  // jpeg / jpg / heic / heif / 不明 → jpeg
  return "image/jpeg";
}

export type RenderResult = {
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

/**
 * SVG 注釈を画像に焼き込む。
 *
 * @param sourceBuffer  原画像 (EXIF strip 済みを想定)
 * @param sourceMime    原画像の MIME (image/jpeg, image/png, image/webp, image/heic)
 * @param doc           注釈ドキュメント
 */
export async function renderAnnotatedImage(
  sourceBuffer: Buffer,
  sourceMime: string,
  doc: AnnotationDocument,
): Promise<RenderResult> {
  // 動的 import: sharp は重く、テスト/ビルド時のロードを後ろにずらす。
  const sharpMod = await import("sharp");
  const sharp = sharpMod.default;

  // まず原画像をデコードし、回転 (EXIF Orientation) を反映した実寸を取る。
  const base = sharp(sourceBuffer).rotate();
  const meta = await base.metadata();
  const width = meta.width ?? doc.imageWidth;
  const height = meta.height ?? doc.imageHeight;

  // 注釈は元画像座標系で持っているが、AnnotationDocument の imageWidth/Height と
  // 実際の画像サイズが食い違う場合がある (e.g. アップロード後に sharp.rotate が
  // 入った)。ここで SVG 側の viewBox をドキュメントに合わせ、sharp 側で
  // density / リサイズせず実寸に伸ばすことで座標を保持する。
  const svgBody = annotationsToSvg(doc);
  const svgWithSize =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${doc.imageWidth} ${doc.imageHeight}" preserveAspectRatio="none">` +
    extractInner(svgBody) +
    `</svg>`;

  const overlayBuffer = Buffer.from(svgWithSize, "utf8");
  const outputMime = pickOutputMime(sourceMime);

  let pipeline = base.composite([{ input: overlayBuffer, top: 0, left: 0 }]);

  if (outputMime === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (outputMime === "image/webp") {
    pipeline = pipeline.webp({ quality: 90 });
  } else {
    pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
  }

  const buffer = await pipeline.toBuffer();
  return { buffer, contentType: outputMime, width, height };
}

/** annotationsToSvg() の結果から外側 <svg> を剥がし、中身だけ取り出す。 */
function extractInner(svg: string): string {
  const open = svg.indexOf(">");
  const closeIdx = svg.lastIndexOf("</svg>");
  if (open < 0 || closeIdx < 0) return "";
  return svg.slice(open + 1, closeIdx);
}
