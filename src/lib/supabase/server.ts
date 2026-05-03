import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * セッション系 cookie のセキュリティ既定値を本番では強制する。
 * Supabase SSR は通常 sameSite=lax / httpOnly=true を付けるが、
 *   - HTTPS 強制下で必ず Secure を付与
 *   - 認証 cookie には httpOnly=true を強制
 *   - sameSite は不指定なら "lax" を補う (Stripe Checkout 等の戻り遷移を壊さない)
 */
function hardenCookieOptions(name: string, options: CookieOptions): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  const isAuthCookie = name.includes("auth-token") || name.includes("supabase");
  return {
    ...options,
    secure: options.secure ?? isProd,
    httpOnly: options.httpOnly ?? isAuthCookie,
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
  };
}

export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env.");
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, hardenCookieOptions(name, options));
          });
        } catch {}
      },
    },
  });
}
