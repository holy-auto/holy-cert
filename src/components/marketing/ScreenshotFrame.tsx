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
    </div>
  );
}
