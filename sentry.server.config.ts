import * as Sentry from "@sentry/nextjs";

/**
 * 個人情報を含む可能性のあるクエリ・ヘッダ・body フィールドのキー名。
 * PR レビューで疑わしいキー名は気軽に追加して差分管理する。
 */
const SENSITIVE_QUERY_KEYS = new Set([
  "token",
  "code",
  "secret",
  "key",
  "password",
  "passwd",
  "pwd",
  "auth",
  "authorization",
  "session",
  "access_token",
  "refresh_token",
  "id_token",
  "api_key",
  "apikey",
  "stripe_token",
  "client_secret",
  "signature",
  "sig",
  "otp",
  "verify_code",
  "phone",
  "tel",
  "email",
  "mail",
]);

const SENSITIVE_HEADER_KEYS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-supabase-auth",
  "x-stripe-signature",
  "stripe-signature",
  "svix-signature",
  "svix-id",
  "x-square-signature",
  "x-line-signature",
  "upstash-signature",
  "x-vercel-signature",
]);

function redactSearch(search: string): string {
  if (!search) return search;
  try {
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    let touched = false;
    for (const key of Array.from(params.keys())) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        params.set(key, "[redacted]");
        touched = true;
      }
    }
    if (!touched) return search;
    return `?${params.toString()}`;
  } catch {
    return "[redacted]";
  }
}

function redactUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.search = redactSearch(u.search);
    return u.toString();
  } catch {
    return url;
  }
}

function redactHeaders(headers: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!headers) return headers;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADER_KEYS.has(k.toLowerCase()) ? "[redacted]" : v;
  }
  return out;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,

  // 既知の良性ノイズ。Next.js 内部の制御フロー throw が Sentry に流れ込むのを抑える。
  ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],

  beforeSend(event, hint) {
    // --- PII / Secrets スクラブ ---
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
      delete event.user.username;
    }
    if (event.request) {
      event.request.url = redactUrl(event.request.url);
      if (typeof event.request.query_string === "string") {
        event.request.query_string = redactSearch(event.request.query_string);
      }
      event.request.headers = redactHeaders(event.request.headers as Record<string, unknown> | undefined) as
        | Record<string, string>
        | undefined;
      // Body / cookies は明示的に落とす — メール / token / OTP を含み得るため。
      if (event.request.data !== undefined) {
        event.request.data = "[redacted]";
      }
      if (typeof event.request.cookies !== "undefined") {
        event.request.cookies = "[redacted]" as unknown as Record<string, string>;
      }
    }

    // --- ビジネス領域タグ付け ---
    const error = hint?.originalException;
    const message = error instanceof Error ? error.message : String(error ?? "");
    const lowerMessage = message.toLowerCase();

    // Billing-related errors (Stripe, subscriptions)
    if (
      lowerMessage.includes("stripe") ||
      lowerMessage.includes("billing") ||
      lowerMessage.includes("subscription")
    ) {
      event.tags = { ...event.tags, business_domain: "billing" };
      event.level = "error";
    }

    // Auth-related errors
    if (
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("forbidden") ||
      lowerMessage.includes("auth")
    ) {
      event.tags = { ...event.tags, business_domain: "auth" };
    }

    // Insurer access errors
    if (lowerMessage.includes("insurer")) {
      event.tags = { ...event.tags, business_domain: "insurer" };
    }

    return event;
  },
});
