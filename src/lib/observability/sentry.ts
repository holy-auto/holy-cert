/**
 * Sentry integration helpers (server-side).
 *
 * Sentry SDK は遅延ロードする — `@sentry/nextjs` をブートで参照すると
 * Edge runtime や test runner で重い import になるため、必要時のみ
 * dynamic import で読み込み、失敗時は no-op にして処理を止めない。
 *
 * `apiInternalError` (response.ts) は既に `captureException` を呼んでいる。
 * このモジュールは「例外でない security-relevant イベント」(webhook 署名失敗、
 * rate limit 連発、認証失敗の集中) を Sentry に送るためのヘルパー。
 */

export type SecurityEventType =
  | "webhook_signature_failed"
  | "webhook_idempotency_claim_failed"
  | "rate_limit_unavailable";

/** Capture a security-relevant non-exception event. */
export function captureSecurityEvent(type: SecurityEventType, context: Record<string, unknown> = {}): void {
  import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setTag("security_event", type);
        scope.setLevel("warning");
        for (const [k, v] of Object.entries(context)) {
          scope.setExtra(k, v);
        }
        Sentry.captureMessage(`security:${type}`, "warning");
      });
    })
    .catch(() => {});
}
