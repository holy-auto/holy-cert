/**
 * Security audit helpers for API routes.
 *
 * Sentry の `captureSecurityEvent` を route 側から呼びやすくする薄いラッパー。
 * 失敗時は IP の生値ではなく SHA-256 接頭辞でハッシュ化して保存し、
 * GDPR / 個人情報保護法上のログ最小化原則を守る。
 *
 * @example
 *   const caller = await resolveCallerWithRole(supabase);
 *   if (!caller) {
 *     auditAuthFailure(req, "session_missing");
 *     return apiUnauthorized();
 *   }
 *   if (!requireMinRole(caller, "admin")) {
 *     auditRoleDenied(req, caller.role, "admin", caller.tenantId);
 *     return apiForbidden();
 *   }
 */

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { captureSecurityEvent, type SecurityEventType } from "@/lib/observability/sentry";
import { getClientIp } from "@/lib/rateLimit";

/**
 * 短い (16 hex chars / 64bit) IP ハッシュを返す。同一攻撃者の集約には十分で、
 * 元 IP の復元は実用上不可能。Sentry 側で PII を持たないようにする。
 */
function hashIp(ip: string): string {
  const salt = process.env.SECURITY_LOG_SALT ?? "ledra-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

function baseContext(req: NextRequest): Record<string, unknown> {
  return {
    path: req.nextUrl?.pathname ?? null,
    method: req.method,
    request_id: req.headers.get("x-request-id") ?? null,
    user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    ip_hash: hashIp(getClientIp(req)),
  };
}

export type AuthFailureReason =
  | "session_missing"
  | "session_invalid"
  | "membership_missing"
  | "tenant_mismatch"
  | "token_expired"
  | "token_invalid"
  | "mfa_required";

/** 認証失敗を記録する。401 を返す直前に呼ぶ。 */
export function auditAuthFailure(req: NextRequest, reason: AuthFailureReason, extra?: Record<string, unknown>): void {
  captureSecurityEvent("auth_failed", { ...baseContext(req), reason, ...(extra ?? {}) });
}

/** ロール不足を記録する。403 を返す直前に呼ぶ。 */
export function auditRoleDenied(
  req: NextRequest,
  actualRole: string,
  requiredRole: string,
  tenantId?: string,
  userId?: string,
): void {
  captureSecurityEvent("auth_role_denied", {
    ...baseContext(req),
    actual_role: actualRole,
    required_role: requiredRole,
    tenant_id: tenantId ?? null,
    user_id: userId ?? null,
  });
}

/** テナント越境アクセス試行を記録する (active_tenant_id の偽装等)。 */
export function auditTenantViolation(
  req: NextRequest,
  attempted: { tenantId: string; userId: string; targetTenantId?: string },
): void {
  captureSecurityEvent("tenant_isolation_violation", {
    ...baseContext(req),
    user_id: attempted.userId,
    caller_tenant: attempted.tenantId,
    target_tenant: attempted.targetTenantId ?? null,
  });
}

/** 入力スキーマで明らかに敵対的な値 (制御文字 / 巨大ペイロード等) を検知した場合。 */
export function auditSuspiciousInput(req: NextRequest, kind: string, extra?: Record<string, unknown>): void {
  captureSecurityEvent("suspicious_input", { ...baseContext(req), kind, ...(extra ?? {}) });
}

/** 任意の security event を直接送る低レベル API。 */
export function auditEvent(req: NextRequest, type: SecurityEventType, extra?: Record<string, unknown>): void {
  captureSecurityEvent(type, { ...baseContext(req), ...(extra ?? {}) });
}
