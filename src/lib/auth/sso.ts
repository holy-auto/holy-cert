/**
 * SSO (SAML 2.0 / OIDC) 認証ヘルパ
 *
 * 現状は **scaffolding** レベル: Supabase Auth の SSO API を thin に
 * ラップする。実運用に乗せるには以下が必要:
 *
 * 1. Supabase プロジェクトで SAML provider を有効化
 *    (`supabase auth providers update saml --enabled true` または
 *     ダッシュボード → Authentication → Providers → SAML)
 * 2. 顧客(IdP) 毎に `auth.sso_providers` レコードを登録
 *    (ドメイン・IdP metadata XML を `auth.sso_domains` に)
 * 3. SAML ACS callback URL は `/auth/callback` を流用
 *    (`exchangeCodeForSession` がそのまま使える)
 *
 * 詳細は `docs/sso-setup.md` 参照。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type SsoStartArgs = {
  /** ユーザの email ドメイン (例: "example.co.jp")。Supabase の sso_domains で IdP に解決される。 */
  domain: string;
  /** ログイン後にリダイレクトする URL (絶対 URL)。 */
  redirectTo: string;
};

export type SsoStartResult = { url: string } | { error: string };

/**
 * Begin SAML SSO. Returns the IdP redirect URL the caller should send the
 * browser to. Caller is responsible for issuing the actual `Response.redirect`.
 *
 * `auth.signInWithSSO` is added to `@supabase/supabase-js` v2.51+. We type
 * it via a structural cast because not every supabase-js peer version
 * exposes it on the client surface.
 */
export async function startSsoSignIn(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  args: SsoStartArgs,
): Promise<SsoStartResult> {
  const domain = args.domain.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return { error: "invalid_domain" };
  }

  const auth = supabase.auth as unknown as {
    signInWithSSO?: (args: {
      domain: string;
      options: { redirectTo: string };
    }) => Promise<{ data: { url: string } | null; error: { message: string } | null }>;
  };

  if (typeof auth.signInWithSSO !== "function") {
    return { error: "sso_unsupported_supabase_version" };
  }

  const res = await auth.signInWithSSO({
    domain,
    options: { redirectTo: args.redirectTo },
  });

  if (res.error || !res.data?.url) {
    return { error: res.error?.message ?? "sso_init_failed" };
  }
  return { url: res.data.url };
}
