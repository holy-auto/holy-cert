"use client";

/**
 * Provider-aware lesson video player.
 *
 * 入力は `resolveLessonPlayback()` の出力 (= `ResolvedLessonVideo`)。
 *   - YouTube → <iframe>
 *   - HLS (CFS / Mux / external m3u8) → <video> with native HLS (Safari) or HLS.js
 *   - external mp4 → <video src>
 *   - status='pending' or 'errored' → 状態カード
 *
 * HLS.js 依存:
 *   `npm install hls.js` — runtime にも Safari がほとんど無い顧客向けの保険。
 *   存在しない場合は dynamic import の catch でフォールバック (<video src> で
 *   試行 → Safari 以外では通常再生不可) し、UI に注意書きを出す。
 */

import { useEffect, useRef, useState } from "react";
import type { ResolvedLessonVideo } from "@/lib/video/resolveLessonPlayback";

interface Props {
  video: ResolvedLessonVideo;
  poster?: string | null;
  title?: string;
}

export function LessonVideoPlayer({ video, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hlsError, setHlsError] = useState<string | null>(null);

  useEffect(() => {
    if (!video.ready || !video.playback_url) return;
    if (video.provider === "youtube") return; // iframe path
    if (video.provider === "external" && !video.playback_url.endsWith(".m3u8")) return; // raw mp4

    const v = videoRef.current;
    if (!v) return;

    // Safari supports HLS natively — let the browser handle it.
    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = video.playback_url;
      return;
    }

    let cancelled = false;
    let hls: { destroy(): void } | null = null;
    (async () => {
      try {
        // hls.js is an optional runtime dep. Compute the specifier at runtime
        // so tsc/bundler does not require its type defs to live in this repo.
        const specifier = "hls" + ".js";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod = (await import(/* webpackIgnore: true */ specifier)) as any;
        const Hls = mod.default ?? mod;
        if (cancelled) return;
        if (typeof Hls.isSupported === "function" && !Hls.isSupported()) {
          setHlsError("hls_unsupported_browser");
          return;
        }
        const inst = new Hls();
        inst.attachMedia(v);
        inst.loadSource(video.playback_url!);
        hls = inst;
      } catch (e) {
        setHlsError(e instanceof Error ? e.message : "hls_load_failed");
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [video.provider, video.playback_url, video.ready]);

  if (!video.ready) {
    return (
      <div className="aspect-video w-full rounded-xl border border-border-subtle bg-inset p-6 text-center">
        {video.status === "errored" ? (
          <p className="text-sm text-danger">動画の処理に失敗しました。再アップロードしてください。</p>
        ) : video.status === "missing" ? (
          <p className="text-sm text-muted">動画が登録されていません。</p>
        ) : (
          <p className="text-sm text-muted">動画を処理中です…完了まで数分かかる場合があります。</p>
        )}
      </div>
    );
  }

  if (video.provider === "youtube" && video.playback_url) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border-subtle">
        <iframe
          src={video.playback_url}
          title={title ?? "lesson video"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-border-subtle bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster ?? video.thumbnail_url ?? undefined}
        className="h-full w-full"
        // External mp4: set src directly so browsers don't wait for the HLS hook.
        src={
          video.provider === "external" && !video.playback_url?.endsWith(".m3u8")
            ? (video.playback_url ?? undefined)
            : undefined
        }
      />
      {hlsError ? (
        <p className="bg-danger/10 px-3 py-2 text-xs text-danger">
          動画の読み込みに失敗しました ({hlsError})。ブラウザを最新化するか別のデバイスでお試しください。
        </p>
      ) : null}
    </div>
  );
}
