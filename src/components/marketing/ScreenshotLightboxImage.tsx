"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  /** macOS chrome の URL ラベル — lightbox 内のキャプションに流用 */
  url?: string;
  sizes?: string;
  objectPosition?: string;
  priority?: boolean;
  /** 実画像の物理サイズ (CLS 防止 / lightbox での縦横比保持に使う) */
  intrinsicWidth?: number;
  intrinsicHeight?: number;
};

/**
 * クリックで lightbox を開く Image。
 * - サムネイルは ScreenshotFrame 内の "画面領域" を占有
 * - クリック → 全画面オーバーレイで原寸に近いサイズで表示
 * - ESC / 背景クリック / 閉じるボタンで閉じる
 */
export function ScreenshotLightboxImage({
  src,
  alt,
  url,
  sizes = "(min-width: 1024px) 56vw, 100vw",
  objectPosition = "center top",
  priority = false,
  intrinsicWidth = 1920,
  intrinsicHeight = 991,
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // close 後は元の trigger にフォーカスを戻す
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="group absolute inset-0 cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label={`${alt} を拡大表示`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-cover"
          style={{ objectPosition }}
          priority={priority}
        />
        {/* クリックヒント (hover で表示) */}
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-1 text-[0.65rem] font-medium text-white/90 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11l3.5 3.5" strokeLinecap="round" />
            <path d="M5 7h4M7 5v4" strokeLinecap="round" />
          </svg>
          拡大
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/90 backdrop-blur-md p-4 md:p-8 cursor-zoom-out animate-[hero-fade-in_180ms_ease-out_both]"
          onClick={() => setOpen(false)}
        >
          {/* 画像本体 — 親への click 伝播は止める */}
          <div className="relative cursor-default" onClick={(e) => e.stopPropagation()}>
            <Image
              src={src}
              alt={alt}
              width={intrinsicWidth}
              height={intrinsicHeight}
              sizes="92vw"
              className="rounded-xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.65)] max-h-[85vh] w-auto h-auto"
              priority
            />
            {/* 閉じるボタン */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-[#060a12] shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="閉じる"
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* キャプション */}
          {url && (
            <div className="font-mono text-xs text-white/70 select-text" onClick={(e) => e.stopPropagation()}>
              {url}
            </div>
          )}

          {/* hint */}
          <div className="text-[0.65rem] text-white/50">クリック / ESC で閉じる</div>
        </div>
      )}
    </>
  );
}
