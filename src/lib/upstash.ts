/**
 * Shared Upstash Redis client. Single connection lazily created when env
 * is configured, returns null otherwise (callers must handle the null
 * branch — the absence of Redis is expected in dev/CI).
 *
 * Used by: rateLimit.ts (preset limiters), whiteLabel/resolveTenantByHost,
 * and any future cache layer.
 */

import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}
