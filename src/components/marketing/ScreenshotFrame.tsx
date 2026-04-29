import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ScreenshotLightboxImage } from "./ScreenshotLightboxImage";

type ScreenshotFrameProps = {
  /**
   * `public/` 配下の画像パス（先頭 "/" 付き）。
   * 例: "/marketing/screenshots/dashboard.png"
   * ファイルが見つからない場合は children をフォールバック表示する。
   */
  src?: string;
  alt: string;
  /** デフォルトはスクショ実画像 (1920×991) に合わせた比率。Tailwind の任意 aspect ratio 文字列で上書き可能。 */
  aspect?: string;
  /** ブラウザ chrome (macOS 風) の URL ラベル。例: "admin.ledra.app/dashboard" */
  url?: string;
  /** chrome を出すかどうか。"none" で非表示。 */
  chrome?: "macos" | "none";
  /** next/image の sizes 属性。 */
  sizes?: string;
  /** 画像の object-position (CSS)。縦長スクショを上寄せで切り抜きたい時など。 */
  objectPosition?: string;
  /** 画像が無い／未配置の時の代替表示。SVG/Tailwind 製モックを想定。 */
  children?: React.ReactNode;
  className?: string;
  /** Above-the-fold の画像なら true */
  priority?: boolean;
};

function publicFilePath(publicPath: string): string {
  return join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}

function publicFileExists(publicPath: string): boolean {
  try {
    return existsSync(publicFilePath(publicPath));
  } catch {
    return false;
  }
}

/**
 * PNG ヘッダから画像の物理サイズを読む。lightbox 表示時に CLS を抑え、
 * 縦横比を正しく保つために使用。失敗したら null を返してデフォルトに任せる。
 */
function readPngDimensions(publicPath: string): { width: number; height: number } | null {
  try {
    const buf = readFileSync(publicFilePath(publicPath)).subarray(0, 24);
    // PNG signature 8 bytes + IHDR length (4) + "IHDR" (4) + width (4) + height (4)
    if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  } catch {
    return null;
  }
}

export function ScreenshotFrame({
  src,
  alt,
  aspect = "aspect-[1920/991]",
  url,
  chrome = "macos",
  sizes = "(min-width: 1024px) 56vw, 100vw",
  objectPosition = "center top",
  children,
  className = "",
  priority = false,
}: ScreenshotFrameProps) {
  const showImage = src ? publicFileExists(src) : false;
  const dimensions = src && showImage ? readPngDimensions(src) : null;

  return (
    <div className={`relative ${className}`}>
      {/* === Screen (lid) === bezel + chrome + image */}
      <div className="relative rounded-t-2xl rounded-b-md bg-gradient-to-b from-[#222a3a] via-[#141925] to-[#0a0d14] p-[6px] md:p-[8px] shadow-[0_30px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* camera dot — lid 上部中央 */}
        <span
          aria-hidden
          className="absolute top-[3px] md:top-[4px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/15"
        />

        {/* inner screen */}
        <div className="rounded-t-xl rounded-b-[3px] border border-white/[0.06] bg-[#060a12] overflow-hidden">
          {chrome === "macos" && (
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.02]">
              <span className="block w-2.5 h-2.5 rounded-full bg-rose-400/50" />
              <span className="block w-2.5 h-2.5 rounded-full bg-amber-400/50" />
              <span className="block w-2.5 h-2.5 rounded-full bg-emerald-400/50" />
              {url && <span className="ml-3 truncate text-[0.65rem] text-white/70 font-mono">{url}</span>}
            </div>
          )}
          <div className={`relative ${aspect} bg-[#060a12]`}>
            {showImage && src ? (
              <ScreenshotLightboxImage
                src={src}
                alt={alt}
                url={url}
                sizes={sizes}
                objectPosition={objectPosition}
                priority={priority}
                intrinsicWidth={dimensions?.width}
                intrinsicHeight={dimensions?.height}
              />
            ) : (
              <div className="absolute inset-0">{children}</div>
            )}
          </div>
        </div>
      </div>

      {/* === Laptop deck (palm rest) — lid よりわずかに広い台形 === */}
      <div
        aria-hidden
        className="relative mx-auto h-[10px] md:h-[14px] bg-gradient-to-b from-[#252c3a] via-[#171c28] to-[#0a0d14] rounded-b-lg shadow-[0_18px_30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]"
        style={{
          width: "104%",
          marginLeft: "-2%",
          clipPath: "polygon(2.5% 0, 97.5% 0, 100% 100%, 0 100%)",
        }}
      >
        {/* hinge cutout (lid と deck の境目の凹み) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[14%] h-[3px] md:h-[4px] rounded-b-md bg-black/75" />
        {/* trackpad hint (細い線で奥行き感を補う) */}
        <div className="absolute bottom-[2px] md:bottom-[3px] left-1/2 -translate-x-1/2 w-[24%] h-[1px] rounded-full bg-white/[0.06]" />
      </div>
    </div>
  );
}
