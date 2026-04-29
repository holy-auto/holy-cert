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
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#222a3a] via-[#141925] to-[#0a0d14] p-[6px] md:p-[8px] shadow-[0_30px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.4)] ${className}`}
    >
      {/* camera dot — 金属の質感を補う小さなアクセント */}
      <span
        aria-hidden
        className="absolute top-[3px] md:top-[4px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/15"
      />

      {/* inner screen */}
      <div className="rounded-xl border border-white/[0.06] bg-[#060a12] overflow-hidden">
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
  );
}
