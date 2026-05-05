/**
 * Bridge `academy_lessons` rows to provider-correct playback data.
 *
 * The lesson row holds raw provider tags; the player needs URLs.
 * Centralising this here means new providers get a single touch point
 * (this function + the provider implementation).
 */

import { getProvider } from "./provider";
import type { VideoProviderName } from "./types";

export interface LessonVideoFields {
  // Legacy (pre-abstraction) — still in DB for back-compat.
  video_url: string | null;
  // Post-abstraction columns.
  video_provider: VideoProviderName | null;
  video_asset_id: string | null;
  video_playback_id: string | null;
  video_status: "pending" | "ready" | "errored" | null;
  video_duration_sec: number | null;
}

export interface ResolvedLessonVideo {
  /** Effective provider after legacy fallback. null = no video at all. */
  provider: VideoProviderName | null;
  /** Whether the player should attempt playback right now. */
  ready: boolean;
  /** HLS / iframe URL the player consumes. null when not ready. */
  playback_url: string | null;
  /** Poster URL. null when no thumbnail is available. */
  thumbnail_url: string | null;
  /** Lifecycle hint for the UI. */
  status: "pending" | "ready" | "errored" | "missing";
  duration_sec: number | null;
}

/**
 * Pure function — does not call out to provider APIs. Provider URL helpers
 * are synchronous so we can use this safely in server components.
 */
export function resolveLessonPlayback(lesson: LessonVideoFields): ResolvedLessonVideo {
  // 1. Modern path: lesson has been processed via the provider abstraction.
  if (lesson.video_provider && lesson.video_playback_id) {
    const provider = getProvider(lesson.video_provider);
    const status = (lesson.video_status ?? "pending") as ResolvedLessonVideo["status"];
    if (status === "ready") {
      return {
        provider: lesson.video_provider,
        ready: true,
        playback_url: provider.getPlaybackUrl(lesson.video_playback_id),
        thumbnail_url: provider.getThumbnailUrl(lesson.video_playback_id, { width: 1280 }) || null,
        status,
        duration_sec: lesson.video_duration_sec,
      };
    }
    return {
      provider: lesson.video_provider,
      ready: false,
      playback_url: null,
      thumbnail_url: null,
      status,
      duration_sec: lesson.video_duration_sec,
    };
  }

  // 2. Legacy path: only video_url is set (external mp4 / HLS / YouTube link).
  if (lesson.video_url) {
    // Heuristic: detect YouTube so the iframe player kicks in instead of <video>.
    const ytMatch = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(lesson.video_url);
    if (ytMatch) {
      // Extract the v= or short id
      const id = extractYoutubeId(lesson.video_url);
      if (id) {
        const provider = getProvider("youtube");
        return {
          provider: "youtube",
          ready: true,
          playback_url: provider.getPlaybackUrl(id),
          thumbnail_url: provider.getThumbnailUrl(id, { width: 1280 }),
          status: "ready",
          duration_sec: lesson.video_duration_sec,
        };
      }
    }
    return {
      provider: "external",
      ready: true,
      playback_url: lesson.video_url,
      thumbnail_url: null,
      status: "ready",
      duration_sec: lesson.video_duration_sec,
    };
  }

  // 3. No video at all.
  return {
    provider: null,
    ready: false,
    playback_url: null,
    thumbnail_url: null,
    status: "missing",
    duration_sec: null,
  };
}

function extractYoutubeId(url: string): string | null {
  // youtu.be/<id>
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return short[1];
  // youtube.com/watch?v=<id>
  const watch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (watch) return watch[1];
  // youtube.com/embed/<id>
  const embed = url.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  if (embed) return embed[1];
  return null;
}
