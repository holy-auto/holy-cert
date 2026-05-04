/**
 * アカウント単位のブルートフォース対策。
 *
 * IP ベースのレート制限 (rateLimit.ts) は分散攻撃に弱いため、
 * 「このメールアドレスへのログイン失敗回数」を Redis でカウントし、
 * 5 回失敗 → 15 分ロックを行う。同一アカウントを多 IP から狙う
 * credential-stuffing 攻撃に有効。
 *
 * 設計:
 *   - キーは email を SHA-256 ハッシュ化して保存 (PII 最小化)
 *   - 成功ログイン時に counter をクリア
 *   - 失敗のたびに INCR、TTL は first failure 時に 15 分でセット
 *   - ロック中の認証試行は時定数応答にして列挙耐性を確保
 *
 * @example
 *   const lock = await checkAccountLock(email);
 *   if (lock.locked) {
 *     auditAuthFailure(req, "session_invalid", { reason: "account_locked" });
 *     return apiError({ code: "rate_limited", status: 429, ... });
 *   }
 *   const result = await supabase.auth.signInWithPassword(...);
 *   if (result.error) {
 *     await recordAuthFailure(email);
 *     return ...;
 *   }
 *   await clearAuthFailures(email);
 */

import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

const MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES ?? "5");
const LOCK_WINDOW_SECONDS = Number(process.env.LOGIN_LOCK_WINDOW_SECONDS ?? "900"); // 15 分

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

/** email を SHA-256 ハッシュ化したキー (PII を Redis に置かない)。 */
function keyFor(email: string): string {
  const salt = process.env.LOGIN_LOCK_SALT ?? "ledra-login-lock";
  const hash = createHash("sha256").update(`${salt}:${email.trim().toLowerCase()}`).digest("hex");
  return `lock:login:${hash.slice(0, 32)}`;
}

export type AccountLockState = {
  locked: boolean;
  failures: number;
  retryAfterSec: number;
};

/** 現在のロック状態を返す。Redis 未設定時は常に non-locked を返す (fail-open)。 */
export async function checkAccountLock(email: string): Promise<AccountLockState> {
  const r = getRedis();
  if (!r) return { locked: false, failures: 0, retryAfterSec: 0 };

  const key = keyFor(email);
  const [count, ttl] = await Promise.all([r.get<number>(key), r.ttl(key)]);
  const failures = Number(count ?? 0);
  const retryAfterSec = ttl && ttl > 0 ? Number(ttl) : 0;

  return {
    locked: failures >= MAX_FAILURES,
    failures,
    retryAfterSec,
  };
}

/**
 * 認証失敗を記録する。失敗カウンタを INCR し、初回失敗で TTL をセット。
 * ロック超過時は返り値の `locked=true` で route 側がリトライ拒否できる。
 */
export async function recordAuthFailure(email: string): Promise<AccountLockState> {
  const r = getRedis();
  if (!r) return { locked: false, failures: 0, retryAfterSec: 0 };

  const key = keyFor(email);
  const failures = await r.incr(key);
  if (failures === 1) {
    await r.expire(key, LOCK_WINDOW_SECONDS);
  }
  const ttl = await r.ttl(key);
  return {
    locked: failures >= MAX_FAILURES,
    failures,
    retryAfterSec: ttl && ttl > 0 ? Number(ttl) : LOCK_WINDOW_SECONDS,
  };
}

/** 認証成功時に失敗カウンタを消去する。 */
export async function clearAuthFailures(email: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(keyFor(email));
}

/** 設定値 (テスト / 監査出力用)。 */
export const ACCOUNT_LOCK_CONFIG = {
  MAX_FAILURES,
  LOCK_WINDOW_SECONDS,
} as const;
