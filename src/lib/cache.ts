/**
 * Upstash-backed memoization helpers.
 *
 * Used for hot read paths where the source-of-truth query is expensive
 * (counts, aggregates, plan lookups) but mild staleness is acceptable.
 *
 * Design notes:
 *   - Falls back to `fn()` when Upstash is not configured. dev / CI keep
 *     working without a Redis dependency.
 *   - Reuses the shared `getRedis()` client from `@/lib/upstash` so the
 *     connection pool is single per process.
 *   - Hit/miss is sampled-logged (1%) — full hit-rate observability lives
 *     in Upstash console; we just want enough signal to debug a stuck cache.
 *   - Tag invalidation is intentionally NOT implemented; collapse cache
 *     keys by tenant/insurer/etc. and call `invalidateByPrefix()`.
 */

import { getRedis } from "@/lib/upstash";
import { logger } from "@/lib/logger";

/** Log roughly 1 in N events. Keeps Vercel log volume sane on hot paths. */
const LOG_SAMPLE = 100;

function maybeLog(level: "info" | "debug", msg: string, ctx: Record<string, unknown>) {
  if (Math.floor(Math.random() * LOG_SAMPLE) !== 0) return;
  logger[level](msg, ctx);
}

/**
 * Redis-cached data fetch.
 *
 *   const plan = await withCache(`tenant-plan:${tenantId}`, 60, () => loadPlan(tenantId));
 *
 * Cache keys SHOULD be `<scope>:<id>:<purpose>` so prefix invalidation by
 * `<scope>:<id>:*` collapses related entries on a single mutation.
 */
export async function withCache<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
  const r = getRedis();
  if (!r) return fn();

  try {
    const cached = await r.get<T>(key);
    if (cached !== null && cached !== undefined) {
      maybeLog("debug", "cache hit", { key, ttlSec });
      return cached;
    }
  } catch (e) {
    logger.warn("cache get failed (falling back to source)", {
      key,
      error: e instanceof Error ? e.message : String(e),
    });
    return fn();
  }

  const data = await fn();
  try {
    await r.set(key, data, { ex: ttlSec });
    maybeLog("debug", "cache miss → fetched", { key, ttlSec });
  } catch (e) {
    // Write failures are non-fatal; we already have the data, just couldn't
    // memoize it for next time.
    logger.warn("cache set failed (returning fresh data)", {
      key,
      error: e instanceof Error ? e.message : String(e),
    });
  }
  return data;
}

/**
 * Invalidate a single cache key. Returns `true` on success, `false` on
 * failure (best-effort — callers should not rely on the return value).
 *
 * Use immediately after a mutation that should be reflected on the next
 * read (e.g. plan upgrade should bust `tenant-plan:<tenantId>`).
 */
export async function invalidateCache(key: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return true; // no cache → nothing to invalidate
  try {
    await r.del(key);
    return true;
  } catch (e) {
    logger.warn("cache invalidate failed", {
      key,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

/**
 * Invalidate every key matching a prefix using a single non-blocking SCAN.
 *
 * Upstash supports `SCAN` with MATCH. We pass a small COUNT hint to keep
 * each round short and stay under any per-request CPU budget.
 *
 * Use sparingly — prefer single-key invalidation when the affected set is
 * known. Prefix invalidation is for "I touched config X, drop everything
 * derived from it" cases.
 */
export async function invalidateByPrefix(prefix: string): Promise<number> {
  const r = getRedis();
  if (!r) return 0;
  let cursor: string | number = 0;
  let deleted = 0;
  try {
    do {
      const result = (await r.scan(cursor, { match: `${prefix}*`, count: 100 })) as [string | number, string[]];
      cursor = result[0];
      const keys = result[1];
      if (keys.length > 0) {
        await r.del(...keys);
        deleted += keys.length;
      }
    } while (Number(cursor) !== 0);
    return deleted;
  } catch (e) {
    logger.warn("cache invalidateByPrefix failed", {
      prefix,
      deleted,
      error: e instanceof Error ? e.message : String(e),
    });
    return deleted;
  }
}
