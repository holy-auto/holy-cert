import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyCronRequest } from "@/lib/cronAuth";

const TEST_SECRET = "my-cron-secret-token";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("CRON_SECRET", TEST_SECRET);
});

describe("verifyCronRequest", () => {
  it("returns unauthorized when CRON_SECRET is not set", () => {
    vi.stubEnv("CRON_SECRET", "");

    const req = new Request("http://localhost/api/cron/job", {
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("CRON_SECRET is not configured");
  });

  it("returns unauthorized when no authorization header is present", () => {
    const req = new Request("http://localhost/api/cron/job");

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Missing or invalid authorization");
  });

  it("returns unauthorized when Bearer token does not match", () => {
    const req = new Request("http://localhost/api/cron/job", {
      headers: { authorization: "Bearer wrong-token" },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Missing or invalid authorization");
  });

  it("returns authorized when Bearer token matches CRON_SECRET", () => {
    const req = new Request("http://localhost/api/cron/job", {
      headers: { authorization: `Bearer ${TEST_SECRET}` },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns authorized when x-vercel-cron-signature matches HMAC", () => {
    const expectedSig = crypto
      .createHmac("sha256", TEST_SECRET)
      .update("")
      .digest("hex");

    const req = new Request("http://localhost/api/cron/job", {
      headers: { "x-vercel-cron-signature": expectedSig },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns unauthorized when x-vercel-cron-signature is invalid", () => {
    const req = new Request("http://localhost/api/cron/job", {
      headers: { "x-vercel-cron-signature": "invalid-signature" },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Invalid Vercel cron signature");
  });

  it("prefers x-vercel-cron-signature over Bearer token", () => {
    // Invalid signature should reject even if valid Bearer is present
    const req = new Request("http://localhost/api/cron/job", {
      headers: {
        "x-vercel-cron-signature": "bad-sig",
        authorization: `Bearer ${TEST_SECRET}`,
      },
    });

    const result = verifyCronRequest(req);
    expect(result.authorized).toBe(false);
    expect(result.error).toBe("Invalid Vercel cron signature");
  });
});
