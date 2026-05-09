"use client";

import { useState, useRef, useId } from "react";

type Props = {
  beforeSrc: string;
  afterSrc: string;
  caption: string | null;
  width: number | null;
  height: number | null;
};

const MIN = 0;
const MAX = 100;
const STEP = 1;

/**
 * Before-After スライダー (自前実装)。
 *
 * - 画像 2 枚を絶対配置で重ね、上に乗っている After 側を `clip-path:
 *   inset(0 (100 - pos)% 0 0)` で右側からクリッピングしてプレビューする
 *   (= スライダーで「左側が After、右側が Before」となる Shop-Ware DVX 風挙動)。
 * - キーボード操作: range input が標準で ←/→/Home/End/PageUp/PageDown を
 *   サポートする (a11y 要件: キーボード ←/→ で操作可能)。
 * - 外部依存ライブラリは追加しない。Tailwind + 1 つの inline style のみ。
 */
export default function BeforeAfterSlider({ beforeSrc, afterSrc, caption, width, height }: Props) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sliderId = useId();

  const aspectRatio = width && height && width > 0 && height > 0 ? `${width} / ${height}` : "4 / 3";
  const label = caption ?? "Before / After";
  const clipRight = Math.max(MIN, Math.min(MAX, MAX - pos));

  return (
    <figure className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-border-default bg-base select-none"
        style={{ aspectRatio }}
      >
        <img
          src={beforeSrc}
          alt={`${label} (Before)`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={afterSrc}
          alt={`${label} (After)`}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${clipRight}% 0 0)` }}
        />

        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white"
        >
          AFTER
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white"
        >
          BEFORE
        </span>

        <div
          aria-hidden
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white shadow-[0_0_4px_rgba(0,0,0,0.6)]"
          style={{ left: `${pos}%` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-900 shadow-md"
          style={{ left: `${pos}%` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5l-5 7 5 7M16 5l5 7-5 7" />
          </svg>
        </div>

        <input
          id={sliderId}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={`${label} スライダー (After / Before の比率を調整)`}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={pos}
          aria-valuetext={`After ${pos}% / Before ${MAX - pos}%`}
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none bg-transparent opacity-0 focus:opacity-0"
        />
      </div>
      <label htmlFor={sliderId} className="sr-only">
        {label} スライダー
      </label>
      {caption ? <figcaption className="text-xs text-muted">{caption}</figcaption> : null}
    </figure>
  );
}
