/**
 * CORS (Cross-Origin Resource Sharing) 厳密ポリシー。
 *
 * 既存の CSRF (proxy.ts) は same-origin POST のみ通す前提なので、
 * 通常 API は CORS を返さない (= デフォルト same-origin only)。
 * しかし以下のケースでは明示的に CORS を許可する必要がある:
 *
 *   1. モバイル App (capacitor:// schema) からの /api/mobile/*
 *   2. 公式 SDK や顧客の社内システムから直接叩く /api/public/*
 *   3. プレビュー環境 (Vercel preview URL) からのテスト接続
 *
 * Origin の allowlist は環境変数 `CORS_ALLOWED_ORIGINS` (カンマ区切り)
 * で管理する。ワイルドカードは使わない (リフレクション CORS の温床)。
 *
 * @example
 *   export async function POST(req: NextRequest) {
 *     const cors = handleCorsPreflight(req);
 *     if (cors) return cors;
 *     // ... 通常処理
 *     return withCorsHeaders(req, apiOk({ ... }));
 *   }
 */

import { NextRequest, NextResponse } from "next/server";

const PARSED_ALLOWLIST = parseAllowlist();

function parseAllowlist(): Set<string> {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  const set = new Set<string>();
  for (const item of raw.split(",")) {
    const trimmed = item.trim();
    if (trimmed) set.add(trimmed);
  }
  // モバイル App scheme は固定で許容
  set.add("capacitor://localhost");
  set.add("http://localhost");
  set.add("ionic://localhost");
  return set;
}

const ALLOWED_HEADERS = ["authorization", "content-type", "idempotency-key", "x-request-id", "x-mobile-version"].join(
  ", ",
);

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

/** 与えられた Origin が allowlist に含まれているか。 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (PARSED_ALLOWLIST.has(origin)) return true;
  // Vercel preview の動的サブドメインを許容するための prefix マッチ
  // CORS_ALLOWED_ORIGIN_PREFIXES=https://ledra-* で前方一致
  const prefixes = (process.env.CORS_ALLOWED_ORIGIN_PREFIXES ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return prefixes.some((p) => origin.startsWith(p));
}

/**
 * Preflight (OPTIONS) を処理する。許可 origin なら 204 を返す。
 * 通常リクエストでは null を返して route の本処理に進む。
 */
export function handleCorsPreflight(req: NextRequest): NextResponse | null {
  if (req.method !== "OPTIONS") return null;
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin!),
  });
}

/** 通常レスポンスに CORS ヘッダを付与する。許可外なら no-op。 */
export function withCorsHeaders(req: NextRequest, response: Response): Response {
  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) return response;
  const headers = corsHeaders(origin!);
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  // Cache 内容が origin 別に変わることをキャッシュレイヤに通知
  const existingVary = response.headers.get("vary");
  response.headers.set("vary", existingVary ? `${existingVary}, Origin` : "Origin");
  return response;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "600",
  };
}
