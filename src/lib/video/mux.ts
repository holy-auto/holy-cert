/**
 * Mux provider — skeleton only.
 *
 * Wired to the same VideoProvider interface as Cloudflare Stream so that
 * a future migration is "implement the methods + flip getProvider()
 * default + run a backfill script" rather than a refactor.
 *
 * To make this provider live:
 *   1. npm i @mux/mux-node
 *   2. Set MUX_TOKEN_ID / MUX_TOKEN_SECRET / MUX_WEBHOOK_SECRET env vars
 *   3. Replace each `not_implemented` return with the real Mux SDK call
 *   4. Add Mux Player JS to the academy lesson page (HLS.js works for
 *      basic playback — Mux Player adds heatmaps / chapters / DRM)
 *
 * The provider is currently registered in src/lib/video/provider.ts but
 * intentionally returns errors so it's never accidentally selected as
 * default before implementation lands.
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

const NOT_IMPLEMENTED: Result<never> = { ok: false, error: "mux_provider_not_implemented" };

export const muxProvider: VideoProvider = {
  name: "mux",

  async createDirectUpload(): Promise<Result<DirectUploadHandle>> {
    // POST https://api.mux.com/video/v1/uploads
    //   body: { new_asset_settings: { playback_policy: ['public'] }, cors_origin: '*' }
    // → { id, url, asset_id, ... } — the URL is a one-time PUT endpoint
    return NOT_IMPLEMENTED;
  },

  async getAsset(): Promise<Result<VideoAsset>> {
    // GET https://api.mux.com/video/v1/assets/{ASSET_ID}
    return NOT_IMPLEMENTED;
  },

  getPlaybackUrl(playback_id, _opts?: PlaybackUrlOptions): string {
    // Public HLS manifest URL format. Signed playback (requires Mux signing
    // key) goes through `Mux.JWT.sign()` which we'll add when implementing.
    return `https://stream.mux.com/${encodeURIComponent(playback_id)}.m3u8`;
  },

  getThumbnailUrl(playback_id, opts?: ThumbnailOptions): string {
    const params = new URLSearchParams();
    if (opts?.time_sec !== undefined) params.set("time", String(opts.time_sec));
    if (opts?.width !== undefined) params.set("width", String(opts.width));
    const qs = params.toString();
    return `https://image.mux.com/${encodeURIComponent(playback_id)}/thumbnail.jpg${qs ? `?${qs}` : ""}`;
  },

  async deleteAsset(): Promise<Result<void>> {
    // DELETE https://api.mux.com/video/v1/assets/{ASSET_ID}
    return NOT_IMPLEMENTED;
  },

  async parseWebhook(_input: WebhookVerifyInput): Promise<Result<NormalizedWebhookEvent>> {
    // Mux signs webhooks with `Mux-Signature: t=<unix>,v1=<hmac-sha256-hex>`.
    // Verify, then map event type:
    //   "video.asset.ready"   → asset.ready
    //   "video.asset.errored" → asset.errored
    //   "video.asset.deleted" → asset.deleted
    //   else                  → ignored
    return NOT_IMPLEMENTED;
  },
};
