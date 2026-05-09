"use client";

import { useState, useRef } from "react";

type Props = {
  src: string;
  poster: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

/**
 * 公開ページ用の動画プレイヤー。
 * - 初期描画は <img poster /> 相当 (再生ボタンオーバレイ付き)。実際の <video>
 *   は再生クリックされるまで mount しないので、Lighthouse の "Avoid large
 *   network payloads" / "Reduce JS execution time" を悪化させない。
 * - <video controls poster preload="none"> を採用し、自動再生はしない。
 * - caption は `aria-label` と画面下キャプションの双方に使う (a11y)。
 */
export default function CertificateVideo({ src, poster, caption, width, height, durationMs }: Props) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const aspectRatio = width && height && width > 0 && height > 0 ? `${width} / ${height}` : "16 / 9";
  const accessibleLabel = caption ?? "施工動画";
  const durationLabel = formatDuration(durationMs);

  return (
    <figure className="space-y-2">
      <div
        className="relative overflow-hidden rounded-xl border border-border-default bg-black"
        style={{ aspectRatio }}
      >
        {playing ? (
          <video
            ref={videoRef}
            src={src}
            poster={poster ?? undefined}
            controls
            preload="metadata"
            playsInline
            autoPlay
            aria-label={accessibleLabel}
            className="h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative h-full w-full cursor-pointer border-0 bg-transparent p-0"
            aria-label={`${accessibleLabel} を再生`}
          >
            {poster ? (
              <img
                src={poster}
                alt={accessibleLabel}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-xs text-muted">
                動画
              </div>
            )}
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg group-hover:bg-white">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
            {durationLabel ? (
              <span
                aria-hidden
                className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white"
              >
                {durationLabel}
              </span>
            ) : null}
          </button>
        )}
      </div>
      {caption ? <figcaption className="text-xs text-muted">{caption}</figcaption> : null}
    </figure>
  );
}

function formatDuration(ms: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
