/**
 * Video streaming provider abstraction.
 *
 * Goal: keep `academy_lessons` agnostic to which CDN-fronted video service
 * actually hosts the bytes. Initial provider is Cloudflare Stream; we may
 * switch to Mux later. Lessons can co-exist on different providers (so
 * migration can be staged: new lessons on Mux, old ones on CFS, until a
 * backfill flips them over).
 *
 * Every method is async and tolerates upstream failures by returning an
 * `error` discriminator instead of throwing — call sites turn that into
 * an HTTP error or a logged warning depending on context.
 */

export type VideoProviderName = "cloudflare" | "mux" | "youtube" | "external";

export interface VideoAsset {
  /** Provider internal ID (CFS uid / Mux asset id). */
  asset_id: string;
  /** Public playback ID. CFS reuses uid; Mux issues a separate playback_id. */
  playback_id: string;
  /** Lifecycle: 'pending' until the provider finishes ingest, then 'ready' or 'errored'. */
  status: "pending" | "ready" | "errored";
  /** Playable runtime in seconds. May be unknown until status='ready'. */
  duration_sec?: number;
  /** Free-form provider-specific data we want to round-trip into JSONB. */
  metadata?: Record<string, unknown>;
}

export interface DirectUploadHandle {
  /** Browser uploads the file directly here (CFS tus / Mux PUT). */
  upload_url: string;
  /** Pre-allocated asset_id we should persist immediately so the webhook
   *  has something to update when ingest finishes. */
  asset_id: string;
  /** Some providers (Mux) issue a separate playback_id at create time. */
  playback_id: string;
  /** Optional: server-side URL the provider will hit when ingest finishes. */
  webhook_url?: string;
  /** Upload URL TTL in seconds. */
  expires_in_sec: number;
}

export interface PlaybackUrlOptions {
  /** Issue a signed (short-lived) playback URL instead of public. */
  signed?: boolean;
  /** Signed URL TTL — provider clamps to its max. */
  ttl_sec?: number;
  /** Tag the viewer for analytics (Mux mux_data) — not used by CFS. */
  viewer_id?: string;
}

export interface ThumbnailOptions {
  /** Seek time in seconds for poster frame. */
  time_sec?: number;
  /** Output width in px (provider scales). */
  width?: number;
}

/**
 * Webhook payload, normalized across providers. Each provider's
 * `parseWebhook()` decodes its own format and returns one of these.
 */
export interface NormalizedWebhookEvent {
  type: "asset.ready" | "asset.errored" | "asset.deleted" | "ignored";
  asset_id: string;
  duration_sec?: number;
  /** Free-form metadata to merge into video_provider_metadata. */
  metadata?: Record<string, unknown>;
}

export interface WebhookVerifyInput {
  /** Raw request body (string or Buffer). MUST NOT be parsed before verification. */
  rawBody: string;
  /** Headers mirror — case-insensitive keys (lowercased) for portability. */
  headers: Record<string, string | undefined>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Single interface every provider implements. Returning Result<T> instead
 * of throwing means call sites can short-circuit cleanly without try/catch
 * around each provider call.
 */
export interface VideoProvider {
  readonly name: VideoProviderName;

  /**
   * Issue a direct-upload handle. Browser uploads the file straight to the
   * provider; we never proxy bytes through our origin.
   */
  createDirectUpload(args: { filename?: string; max_duration_sec?: number }): Promise<Result<DirectUploadHandle>>;

  /**
   * Read current asset state. Used by `[id]/refresh-status` cron-style
   * fallback if a webhook is lost.
   */
  getAsset(asset_id: string): Promise<Result<VideoAsset>>;

  /**
   * Resolve the HLS / MP4 playback URL for the player.
   *
   * Synchronous on purpose: pure URL construction. Signed-URL minting that
   * needs a network round-trip should go in a separate `signPlayback()`
   * helper if a provider requires it.
   */
  getPlaybackUrl(playback_id: string, opts?: PlaybackUrlOptions): string;

  /** Resolve a poster image URL. */
  getThumbnailUrl(playback_id: string, opts?: ThumbnailOptions): string;

  /** Best-effort delete — caller must tolerate failure (asset may be gone). */
  deleteAsset(asset_id: string): Promise<Result<void>>;

  /**
   * Validate webhook signature and decode into a normalized event.
   * Implementations MUST verify the signature before returning ok.
   */
  parseWebhook(input: WebhookVerifyInput): Promise<Result<NormalizedWebhookEvent>>;
}
