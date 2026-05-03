import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * CSP violation report endpoint.
 *
 * `Content-Security-Policy` の `report-to` / `report-uri` ディレクティブが
 * このエンドポイントに POST する。違反は Sentry に送って継続監視する。
 *
 * 認証は付けない (ブラウザがバックグラウンドで送るため Cookie / CSRF が
 * 不安定)。ただし
 *   - サイズ上限 32KB
 *   - レート制限 (proxy.ts の middleware_default で 300 req/min)
 *   - JSON でない / 想定外フィールドは静かに 204 で終了
 * で abuse 耐性を確保する。
 */
const MAX_REPORT_BYTES = 32 * 1024;

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REPORT_BYTES) {
    return new NextResponse(null, { status: 413 });
  }

  let payload: unknown;
  try {
    const text = await req.text();
    if (!text || text.length > MAX_REPORT_BYTES) {
      return new NextResponse(null, { status: 204 });
    }
    payload = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  // CSP Level 2 (`report-uri`): { "csp-report": {...} }
  // CSP Level 3 (`report-to`):  [{ type: "csp-violation", body: {...} }]
  const reports = Array.isArray(payload) ? payload : [payload];
  for (const r of reports) {
    const violation = extractViolation(r);
    if (!violation) continue;

    // Drop noise — chrome extensions and browser quirks dominate CSP reports
    // in the wild. Filter here so Sentry isn't flooded.
    if (isNoise(violation)) continue;

    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.withScope((scope) => {
          scope.setTag("security_event", "csp_violation");
          scope.setLevel("warning");
          scope.setExtras(violation);
          Sentry.captureMessage(`csp:${violation["effective-directive"] ?? "violation"}`, "warning");
        });
      })
      .catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}

function extractViolation(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r["csp-report"] && typeof r["csp-report"] === "object") {
    return r["csp-report"] as Record<string, unknown>;
  }
  if (r.type === "csp-violation" && r.body && typeof r.body === "object") {
    return r.body as Record<string, unknown>;
  }
  return null;
}

function isNoise(v: Record<string, unknown>): boolean {
  const blocked = String(v["blocked-uri"] ?? v.blockedURL ?? "");
  const source = String(v["source-file"] ?? v.sourceFile ?? "");
  return (
    blocked.startsWith("chrome-extension:") ||
    blocked.startsWith("safari-extension:") ||
    blocked.startsWith("moz-extension:") ||
    blocked.startsWith("about:") ||
    source.startsWith("chrome-extension:") ||
    source.startsWith("safari-extension:") ||
    source.startsWith("moz-extension:")
  );
}
