/**
 * YouTube (unlisted / public) provider — pass-through only.
 *
 * Used when the lesson author already has a YouTube video and wants
 * Ledra to embed it. We do NOT upload, transcode, or webhook — the
 * canonical record is the YouTube video ID, and Ledra just embeds the
 * iframe player.
 *
 * Caveats for product:
 *   - YouTube branding will appear (logo / "Watch on YouTube" link)
 *   - Ads can run unless the channel disables monetization
 *   - "Unlisted" is not private — the URL leaking = anyone can watch
 *   - YouTube's ToS forbids most paid academy use cases; double-check
 *     with the customer before defaulting to this provider
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

const NOT_SUPPORTED: Result<never> = { ok: false, error: "youtube_pass_through_only" };

export const youtubeProvider: VideoProvider = {
  name: "youtube",

  async createDirectUpload(): Promise<Result<DirectUploadHandle>> {
    return NOT_SUPPORTED;
  },

  async getAsset(asset_id): Promise<Result<VideoAsset>> {
    return {
      ok: true,
      data: {
        asset_id,
        playback_id: asset_id,
        // YouTube metadata fetch would need OAuth + Data API quota.
        // For pass-through embeds we just trust the ID exists.
        status: "ready",
        metadata: { source: "youtube" },
      },
    };
  },

  getPlaybackUrl(playback_id, _opts?: PlaybackUrlOptions): string {
    // Embed URL — caller renders this inside an <iframe>. NOT an HLS URL.
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(playback_id)}?rel=0&modestbranding=1`;
  },

  getThumbnailUrl(playback_id, opts?: ThumbnailOptions): string {
    // YouTube serves preset sizes; pick max if width >= 480.
    const high = opts?.width === undefined || opts.width >= 480;
    const size = high ? "hqdefault" : "mqdefault";
    return `https://i.ytimg.com/vi/${encodeURIComponent(playback_id)}/${size}.jpg`;
  },

  async deleteAsset(): Promise<Result<void>> {
    return NOT_SUPPORTED;
  },

  async parseWebhook(_input: WebhookVerifyInput): Promise<Result<NormalizedWebhookEvent>> {
    return NOT_SUPPORTED;
  },
};
