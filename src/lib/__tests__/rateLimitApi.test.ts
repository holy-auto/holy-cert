import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

const mockLimit = vi.fn();

function makeRequest(
  url = "http://localhost/api/test",
  headers?: Record<string, string>,
): NextRequest {
  return new NextRequest(url, { headers });
}

function setupMocks() {
  // Redis mock - must be a real class (constructor)
  vi.doMock("@upstash/redis", () => {
    class FakeRedis {
      constructor(_opts: unknown) { /* noop */ }
    }
    return { Redis: FakeRedis };
  });

  // Ratelimit mock
  vi.doMock("@upstash/ratelimit", () => {
    class FakeRatelimit {
      constructor(_opts: unknown) { /* noop */ }
      limit = mockLimit;
      static slidingWindow(_tokens: number, _window: string) {
        return "sliding-window-config";
      }
    }
    return { Ratelimit: FakeRatelimit };
  });
}

describe("checkRateLimit (no Redis)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when Redis env vars are not configured", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    setupMocks();
    const mod = await import("@/lib/api/rateLimit");

    const req = makeRequest();
    const result = await mod.checkRateLimit(req, "general");
    expect(result).toBeNull();
  });
});

describe("checkRateLimit (with Redis)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.com";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    setupMocks();
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("returns null when within rate limit", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: true, remaining: 59, reset: Date.now() + 60000 });

    const req = makeRequest();
    const result = await mod.checkRateLimit(req, "general");
    expect(result).toBeNull();
  });

  it("returns 429 response when rate limit exceeded", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30000 });

    const req = makeRequest();
    const result = await mod.checkRateLimit(req, "general");
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
    const body = await result!.json();
    expect(body.error).toBe("rate_limited");
  });

  it("uses custom identifier when provided", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });

    const req = makeRequest();
    await mod.checkRateLimit(req, "auth", "user-abc");
    expect(mockLimit).toHaveBeenCalledWith("user-abc");
  });

  it("extracts IP from x-forwarded-for", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: true, remaining: 58, reset: Date.now() + 60000 });

    const req = makeRequest("http://localhost/api/test", {
      "x-forwarded-for": "203.0.113.1, 10.0.0.1",
    });
    await mod.checkRateLimit(req, "general");
    expect(mockLimit).toHaveBeenCalledWith("203.0.113.1");
  });

  it("extracts IP from x-real-ip as fallback", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: true, remaining: 58, reset: Date.now() + 60000 });

    const req = makeRequest("http://localhost/api/test", {
      "x-real-ip": "10.0.0.5",
    });
    await mod.checkRateLimit(req, "general");
    expect(mockLimit).toHaveBeenCalledWith("10.0.0.5");
  });

  it("uses 'unknown' when no IP headers present", async () => {
    const mod = await import("@/lib/api/rateLimit");
    mockLimit.mockResolvedValue({ success: true, remaining: 58, reset: Date.now() + 60000 });

    const req = makeRequest();
    await mod.checkRateLimit(req, "general");
    expect(mockLimit).toHaveBeenCalledWith("unknown");
  });
});
