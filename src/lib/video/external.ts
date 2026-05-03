/**
 * External pass-through provider — used when academy_lessons.video_url
 * already points at a public mp4/HLS stream we don't manage (legacy
 * lessons created before the provider abstraction landed).
 *
 * The asset_id IS the URL. No upload / webhook / delete — read-only.
 */

import type {
  DirectUploadHandle,
  NormalizedWebhookEvent,
  PlaybackUrlOptions,
  Result,
  ThumbnailOptions,
  VideoAsset,
  VideoProvider,
  WebhookVerifyInput,
} from "./types";

const NOT_SUPPORTED: Result<never> = { ok: false, error: "external_pass_through_only" };

export const externalProvider: VideoProvider = {
  name: "external",

  async createDirectUpload(): Promise<Result<DirectUploadHandle>> {
    return NOT_SUPPORTED;
  },

  async getAsset(asset_id): Promise<Result<VideoAsset>> {
    return {
      ok: true,
      data: { asset_id, playback_id: asset_id, status: "ready", metadata: { source: "external" } },
    };
  },

  getPlaybackUrl(playback_id, _opts?: PlaybackUrlOptions): string {
    // playback_id is the raw URL for this provider.
    return playback_id;
  },

  getThumbnailUrl(_playback_id, _opts?: ThumbnailOptions): string {
    // No thumbnail service — caller should fall back to a static placeholder.
    return "";
  },

  async deleteAsset(): Promise<Result<void>> {
    return NOT_SUPPORTED;
  },

  async parseWebhook(_input: WebhookVerifyInput): Promise<Result<NormalizedWebhookEvent>> {
    return NOT_SUPPORTED;
  },
};
