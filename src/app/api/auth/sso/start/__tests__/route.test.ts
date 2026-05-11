import { describe, it, expect, vi, beforeEach } from "vitest";

const { startSsoSignInMock, signInWithSSOMock } = vi.hoisted(() => ({
  startSsoSignInMock: vi.fn(),
  signInWithSSOMock: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 4 }),
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/url", () => ({
  resolveBaseUrl: () => "https://app.example",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({ auth: { signInWithSSO: signInWithSSOMock } }),
}));

vi.mock("@/lib/auth/sso", () => ({
  startSsoSignIn: (...args: unknown[]) => startSsoSignInMock(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "@/app/api/auth/sso/start/route";
import { checkRateLimit } from "@/lib/rateLimit";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/auth/sso/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/sso/start", () => {
  beforeEach(() => {
    startSsoSignInMock.mockReset();
    signInWithSSOMock.mockReset();
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 4 });
  });

  it("rate limits to 5/min per IP", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSec: 30, remaining: 0 });
    const res = await POST(jsonReq({ domain: "example.co.jp" }));
    expect(res.status).toBe(429);
    expect(startSsoSignInMock).not.toHaveBeenCalled();
  });

  it("returns 400 when payload is invalid", async () => {
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 invalid_domain when the helper rejects", async () => {
    startSsoSignInMock.mockResolvedValueOnce({ error: "invalid_domain" });
    const res = await POST(jsonReq({ domain: "not-a-domain" }));
    expect(res.status).toBe(400);
  });

  it("returns 501 when supabase-js lacks signInWithSSO", async () => {
    startSsoSignInMock.mockResolvedValueOnce({ error: "sso_unsupported_supabase_version" });
    const res = await POST(jsonReq({ domain: "example.co.jp" }));
    expect(res.status).toBe(501);
  });

  it("returns 404 sso_not_configured for any other helper error", async () => {
    startSsoSignInMock.mockResolvedValueOnce({ error: "no provider for domain" });
    const res = await POST(jsonReq({ domain: "example.co.jp" }));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("sso_not_configured");
  });

  it("returns 200 with the IdP URL on success and threads `next` through redirectTo", async () => {
    startSsoSignInMock.mockResolvedValueOnce({ url: "https://idp.example/saml/start?..." });

    const res = await POST(jsonReq({ domain: "example.co.jp", next: "/admin/certificates" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url: string };
    expect(body.url).toContain("idp.example");

    expect(startSsoSignInMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        domain: "example.co.jp",
        redirectTo: "https://app.example/auth/callback?next=%2Fadmin%2Fcertificates",
      }),
    );
  });

  it("rejects open-redirect attempts via the `next` parameter", async () => {
    startSsoSignInMock.mockResolvedValueOnce({ url: "https://idp.example/saml/start" });

    await POST(jsonReq({ domain: "example.co.jp", next: "//attacker.com/steal" }));
    // The route should have stripped the unsafe next and called helper without it.
    expect(startSsoSignInMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ redirectTo: "https://app.example/auth/callback" }),
    );
  });
});
