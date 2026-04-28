import { existsSync } from "fs";
import { join } from "path";
import Image from "next/image";

type ScreenshotFrameProps = {
  /**
   * `public/` 配下の画像パス（先頭 "/" 付き）。
   * 例: "/marketing/screenshots/dashboard.png"
   * ファイルが見つからない場合は children をフォールバック表示する。
   */
  src?: string;
  alt: string;
  /** デフォルト 16/10。Tailwind の任意 aspect ratio 文字列。 */
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

function publicFileExists(publicPath: string): boolean {
  try {
    return existsSync(join(process.cwd(), "public", publicPath.replace(/^\//, "")));
  } catch {
    return false;
  }
}

export function ScreenshotFrame({
  src,
  alt,
  aspect = "aspect-[16/10]",
  url,
  chrome = "macos",
  sizes = "(min-width: 1024px) 56vw, 100vw",
  objectPosition = "center top",
  children,
  className = "",
  priority = false,
}: ScreenshotFrameProps) {
  const showImage = src ? publicFileExists(src) : false;

  return (
    <div
      className={`rounded-2xl border border-white/[0.1] bg-gradient-to-br from-[#0a0f1a] to-[#0b111c] shadow-[0_30px_80px_rgba(0,0,0,0.5)] overflow-hidden ${className}`}
    >
      {chrome === "macos" && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="block w-2.5 h-2.5 rounded-full bg-rose-400/40" />
          <span className="block w-2.5 h-2.5 rounded-full bg-amber-400/40" />
          <span className="block w-2.5 h-2.5 rounded-full bg-emerald-400/40" />
          {url && <span className="ml-3 truncate text-[0.65rem] text-white/70 font-mono">{url}</span>}
        </div>
      )}
      <div className={`relative ${aspect} bg-[#060a12]`}>
        {showImage && src ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
            style={{ objectPosition }}
            priority={priority}
          />
        ) : (
          <div className="absolute inset-0">{children}</div>
        )}
      </div>
    </div>
  );
}
