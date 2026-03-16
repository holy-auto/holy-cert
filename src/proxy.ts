import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// ---------------------------------------------------------------------------
// 1. Public route definitions
// ---------------------------------------------------------------------------
const PUBLIC_PREFIXES = [
  "/login",
  "/auth/callback",
  "/c/",
  "/customer/",
  "/insurer/login",
  "/insurer/forgot-password",
  "/insurer/reset-password",
  "/insurer/c/",
  "/market/login",
  "/market/register",
  "/market/search",
  "/market/p/",
  "/api/",
  "/probe",
];

const MARKETING_PATHS = [
  "/", "/pricing", "/for-shops", "/for-insurers",
  "/faq", "/contact", "/privacy", "/terms", "/tokusho",
];

// ---------------------------------------------------------------------------
// 2. Security headers
// ---------------------------------------------------------------------------
function applySecurityHeaders(request: NextRequest, response: NextResponse): void {
  const isProd = process.env.NODE_ENV === "production";

  // Build CSP
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let supabaseHost = "";
  try {
    supabaseHost = new URL(supabaseUrl).hostname;
  } catch { /* ignore */ }

  const connectSrc = [
    "'self'",
    supabaseUrl,
    supabaseUrl ? supabaseUrl.replace("https://", "wss://") : "",
    "https://api.stripe.com",
    "https://api.resend.com",
  ]
    .filter(Boolean)
    .join(" ");

  const devExtra = isProd ? "" : " http://localhost:* ws://localhost:*";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://api.qrserver.com ${supabaseHost ? `https://${supabaseHost}` : ""}`,
    `font-src 'self' https://cdn.jsdelivr.net`,
    `connect-src ${connectSrc}${devExtra}`,
    `frame-src https://js.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join("; ");

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", csp);

  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Main proxy handler
// ---------------------------------------------------------------------------
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Marketing pages and public routes: pass through
  if (MARKETING_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return refreshSession(request);
  }

  // Protected routes: refresh session then check auth
  return refreshSessionAndProtect(request);
}

export default proxy;

// ---------------------------------------------------------------------------
// 4. Session helpers
// ---------------------------------------------------------------------------

/** Create Supabase client for proxy (uses request/response cookies) */
function createProxySupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/** Refresh Supabase session cookies on every request */
function refreshSession(request: NextRequest) {
  const response = NextResponse.next({ request });
  applySecurityHeaders(request, response);

  const supabase = createProxySupabaseClient(request, response);
  if (supabase) {
    // Fire getUser to refresh the session token
    supabase.auth.getUser();
  }

  return response;
}

/** Refresh session + redirect unauthenticated users */
async function refreshSessionAndProtect(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request });
  applySecurityHeaders(request, response);

  const supabase = createProxySupabaseClient(request, response);
  if (!supabase) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (pathname.startsWith("/admin")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    if (pathname.startsWith("/insurer")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/insurer/login";
      return NextResponse.redirect(redirectUrl);
    }
    if (pathname.startsWith("/market")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/market/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
