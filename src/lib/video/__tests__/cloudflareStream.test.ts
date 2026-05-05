import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { cloudflareStreamProvider } from "@/lib/video/cloudflareStream";

const SECRET = "test-cfs-webhook-secret";

describe("cloudflareStreamProvider — URLs", () => {
  beforeEach(() => {
    delete process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
  });

  it("returns a public HLS manifest URL", () => {
    const url = cloudflareStreamProvider.getPlaybackUrl("abc123");
    expect(url).toMatch(/^https:\/\/customer-abc123\.cloudflarestream\.com\/abc123\/manifest\/video\.m3u8$/);
  });

  it("uses CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN when set", () => {
    process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN = "videos.example.com";
    try {
      const url = cloudflareStreamProvider.getPlaybackUrl("abc");
      expect(url).toBe("https://videos.example.com/abc/manifest/video.m3u8");
    } finally {
      delete process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;
    }
  });

  it("returns a thumbnail URL with optional time/width", () => {
    const url = cloudflareStreamProvider.getThumbnailUrl("abc", { time_sec: 15, width: 320 });
    expect(url).toContain("/abc/thumbnails/thumbnail.jpg");
    expect(url).toContain("time=15s");
    expect(url).toContain("width=320");
  });
});

describe("cloudflareStreamProvider — webhook verification", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET;
    process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET = SECRET;
    process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
    process.env.CLOUDFLARE_STREAM_API_TOKEN = "token";
  });
  afterEach(() => {
    process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET = originalSecret;
  });

  function signedHeaders(rawBody: string, time = Math.floor(Date.now() / 1000)) {
    const sig = crypto.createHmac("sha256", SECRET).update(`${time}.${rawBody}`).digest("hex");
    return { "webhook-signature": `time=${time},sig1=${sig}` };
  }

  it("rejects when signature header is missing", async () => {
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: '{"uid":"abc"}',
      headers: {},
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("missing_signature_header");
  });

  it("rejects malformed signature header", async () => {
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: '{"uid":"abc"}',
      headers: { "webhook-signature": "junk" },
    });
    expect(res.ok).toBe(false);
  });

  it("rejects stale signatures (>5 min)", async () => {
    const old = Math.floor(Date.now() / 1000) - 600;
    const body = '{"uid":"abc"}';
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: body,
      headers: signedHeaders(body, old),
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("stale_signature");
  });

  it("rejects mismatched signature", async () => {
    const body = '{"uid":"abc"}';
    const time = Math.floor(Date.now() / 1000);
    const wrongSig = "deadbeef".repeat(8);
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: body,
      headers: { "webhook-signature": `time=${time},sig1=${wrongSig}` },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("invalid_signature");
  });

  it("accepts valid signature and maps readyToStream → asset.ready", async () => {
    const body = JSON.stringify({ uid: "asset-1", readyToStream: true, duration: 123.4 });
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: body,
      headers: signedHeaders(body),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.type).toBe("asset.ready");
      expect(res.data.asset_id).toBe("asset-1");
      expect(res.data.duration_sec).toBe(123);
    }
  });

  it("maps state=error → asset.errored", async () => {
    const body = JSON.stringify({ uid: "asset-2", status: { state: "error" } });
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: body,
      headers: signedHeaders(body),
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.type).toBe("asset.errored");
      expect(res.data.asset_id).toBe("asset-2");
    }
  });

  it("returns error when CFS env is missing", async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    const res = await cloudflareStreamProvider.parseWebhook({
      rawBody: '{"uid":"x"}',
      headers: { "webhook-signature": "time=1,sig1=x" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe("cloudflare_stream_not_configured");
  });
});
