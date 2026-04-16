import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined; // undefined = not initialised yet

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

/**
 * Redis キャッシュ付きデータ取得。
 * Redis が未設定の場合は fn() を直接実行（fallback）。
 *
 * テナント固有データには key に tenantId を含める:
 *   withCache(`dashboard-summary:${tenantId}`, 30, () => fetchStats())
 *
 * @param key  キャッシュキー
 * @param ttl  TTL（秒）
 * @param fn   実際のデータ取得関数
 */
export async function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const r = getRedis();
  if (!r) return fn();

  const cached = await r.get<T>(key);
  if (cached !== null) return cached;

  const data = await fn();
  await r.set(key, data, { ex: ttl });
  return data;
}
