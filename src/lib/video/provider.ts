/**
 * Provider factory.
 *
 * `getProvider(name)` returns the implementation for a given provider tag
 * persisted in `academy_lessons.video_provider`. `getDefaultProvider()`
 * returns the one new uploads should use today; flipping that single
 * function (after running the backfill) is the entire migration switch.
 */

import { cloudflareStreamProvider } from "./cloudflareStream";
import { externalProvider } from "./external";
import { muxProvider } from "./mux";
import { youtubeProvider } from "./youtube";
import type { VideoProvider, VideoProviderName } from "./types";

const REGISTRY: Record<VideoProviderName, VideoProvider> = {
  cloudflare: cloudflareStreamProvider,
  mux: muxProvider,
  youtube: youtubeProvider,
  external: externalProvider,
};

export function getProvider(name: VideoProviderName): VideoProvider {
  const p = REGISTRY[name];
  if (!p) throw new Error(`unknown_video_provider:${name}`);
  return p;
}

/**
 * Default provider for new lesson uploads.
 *
 * To migrate to Mux:
 *   1. Implement src/lib/video/mux.ts
 *   2. Set DEFAULT_VIDEO_PROVIDER=mux in env (or change this default)
 *   3. Run scripts/backfill-video-provider.ts to copy CFS assets across
 *
 * Steps 1+2 alone make NEW uploads land on Mux while existing CFS
 * lessons keep working — no DB migration, no schema change.
 */
export function getDefaultProvider(): VideoProvider {
  const envName = process.env.DEFAULT_VIDEO_PROVIDER?.trim() as VideoProviderName | undefined;
  if (envName && envName in REGISTRY) return REGISTRY[envName];
  return cloudflareStreamProvider;
}

export type { VideoProvider, VideoProviderName } from "./types";
