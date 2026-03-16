import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Singleton Redis instance (reused across limiters)
// ---------------------------------------------------------------------------
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Create a rate limiter (returns null when Redis is unavailable)
// ---------------------------------------------------------------------------
export function createRateLimit(config: {
  prefix: string;
  limit: number;
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d` | `${number} ms`;
}): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    prefix: config.prefix,
    analytics: false,
  });
}

// ---------------------------------------------------------------------------
// Extract client IP from request (Vercel / proxy aware)
// ---------------------------------------------------------------------------
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs; the first is the client
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") ?? "127.0.0.1";
}

// ---------------------------------------------------------------------------
// Standardised 429 response
// ---------------------------------------------------------------------------
export function rateLimitResponse(resetTimestamp?: number): NextResponse {
  const retryAfter = resetTimestamp
    ? Math.max(0, Math.ceil((resetTimestamp - Date.now()) / 1000))
    : 60;

  return NextResponse.json(
    { error: "rate_limit_exceeded" },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    },
  );
}
