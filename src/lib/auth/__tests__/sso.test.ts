import { describe, it, expect, vi } from "vitest";
import { startSsoSignIn } from "@/lib/auth/sso";

function makeSupabase(impl?: ReturnType<typeof vi.fn>) {
  return { auth: { signInWithSSO: impl } } as unknown as Parameters<typeof startSsoSignIn>[0];
}

describe("startSsoSignIn", () => {
  it("rejects invalid domains", async () => {
    const supabase = makeSupabase(vi.fn());
    const res = await startSsoSignIn(supabase, { domain: "not-a-domain", redirectTo: "https://app/auth/callback" });
    expect("error" in res && res.error).toBe("invalid_domain");
  });

  it("returns an error when supabase-js does not expose signInWithSSO", async () => {
    const supabase = { auth: {} } as Parameters<typeof startSsoSignIn>[0];
    const res = await startSsoSignIn(supabase, {
      domain: "example.com",
      redirectTo: "https://app/auth/callback",
    });
    expect("error" in res && res.error).toBe("sso_unsupported_supabase_version");
  });

  it("returns the IdP redirect URL on success", async () => {
    const signInWithSSO = vi.fn().mockResolvedValue({
      data: { url: "https://idp.example/saml/login?SAMLRequest=..." },
      error: null,
    });
    const supabase = makeSupabase(signInWithSSO);
    const res = await startSsoSignIn(supabase, {
      domain: "Example.Com",
      redirectTo: "https://app/auth/callback",
    });
    expect("url" in res && res.url).toContain("idp.example");
    expect(signInWithSSO).toHaveBeenCalledWith({
      domain: "example.com",
      options: { redirectTo: "https://app/auth/callback" },
    });
  });

  it("propagates supabase error message", async () => {
    const signInWithSSO = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "no provider for domain" },
    });
    const supabase = makeSupabase(signInWithSSO);
    const res = await startSsoSignIn(supabase, {
      domain: "example.com",
      redirectTo: "https://app/auth/callback",
    });
    expect("error" in res && res.error).toBe("no provider for domain");
  });
});
