/**
 * White-label host resolution.
 *
 * 顧客が自社 FQDN (`pf.example.co.jp`) で Ledra にアクセスしたとき、
 * Host header からテナントを解決する。proxy.ts でこのヘルパを呼んで
 * `request.headers.set('x-tenant-id', tenantId)` し、下流 route が拾う。
 *
 * パフォーマンス: Edge runtime で proxy.ts は動くため、毎リクエスト DB
 * コールしないよう Upstash Redis にキャッシュ (TTL 60s)。Redis 未設定時は
 * in-memory map にフォールバック。
 *
 * Phase 1: 解決のみ実装。proxy.ts への配線は別 PR (Vercel Domains API
 * で証明書発行 + DNS 検証 cron が揃ってから)。
 */

import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { getRedis } from "@/lib/upstash";

const TTL_SEC = 60;
// In-memory fallback cache (single-instance only — Upstash should be set in prod).
const memoryCache = new Map<string, { tenantId: string | null; until: number }>();

/**
 * Resolve `tenant_id` for a given Host header. Returns null when:
 *   - the host is the platform host (app.ledra.co.jp, etc.)
 *   - no verified custom domain matches
 */
export async function resolveTenantByHost(host: string | null | undefined): Promise<string | null> {
  if (!host) return null;
  const normalized = host.toLowerCase().split(":")[0]; // strip port

  // Hard-coded platform hosts shortcut (cheaper than a DB hit).
  const platformHosts = (process.env.PLATFORM_HOSTS ?? "ledra.co.jp,app.ledra.co.jp,www.ledra.co.jp")
    .split(",")
    .map((h) => h.trim().toLowerCase());
  if (platformHosts.includes(normalized)) return null;
  if (normalized.endsWith(".vercel.app")) return null;

  // Cache lookup
  const now = Date.now();
  const mem = memoryCache.get(normalized);
  if (mem && mem.until > now) return mem.tenantId;

  const redis = getRedis();
  if (redis) {
    const cached = await redis.get<string>(`whitelabel:host:${normalized}`).catch(() => null);
    if (cached === "__none__") return null;
    if (cached) return cached;
  }

  const admin = createServiceRoleAdmin("white-label host resolution — pre-tenant lookup by hostname");

  const { data } = await admin
    .from("tenant_custom_domains")
    .select("tenant_id, status")
    .eq("hostname", normalized)
    .eq("status", "verified")
    .maybeSingle();

  const tenantId = (data as { tenant_id?: string } | null)?.tenant_id ?? null;

  // Cache positive AND negative results — negative caching is critical to
  // avoid DB hits from every request to a typo'd host.
  memoryCache.set(normalized, { tenantId, until: now + TTL_SEC * 1000 });
  if (redis) {
    await redis.set(`whitelabel:host:${normalized}`, tenantId ?? "__none__", { ex: TTL_SEC }).catch(() => undefined);
  }

  return tenantId;
}

/** Test-only — clear in-memory cache. */
export function __resetWhiteLabelCacheForTest(): void {
  memoryCache.clear();
}
