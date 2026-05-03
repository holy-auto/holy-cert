import { describe, it, expect, vi } from "vitest";
import { enrollTotp, verifyEnroll, unenrollFactor, isAal2Verified } from "@/lib/auth/mfa";

function fakeMfa(overrides: Record<string, unknown> = {}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { auth: { mfa: overrides } } as any;
}

describe("enrollTotp", () => {
  it("returns error when supabase-js lacks mfa", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await enrollTotp({ auth: {} } as any);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("mfa_unsupported_supabase_version");
  });

  it("returns factor + uri + secret on success", async () => {
    const r = await enrollTotp(
      fakeMfa({
        enroll: vi.fn().mockResolvedValue({
          data: { id: "f1", totp: { uri: "otpauth://totp/...", secret: "JBSWY3DPEHPK3PXP" } },
          error: null,
        }),
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.factor_id).toBe("f1");
  });

  it("propagates supabase error", async () => {
    const r = await enrollTotp(
      fakeMfa({ enroll: vi.fn().mockResolvedValue({ data: null, error: { message: "rate_limited" } }) }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("rate_limited");
  });
});

describe("verifyEnroll", () => {
  it("rejects invalid code via supabase error", async () => {
    const r = await verifyEnroll(
      fakeMfa({
        challenge: vi.fn().mockResolvedValue({ data: { id: "c1" }, error: null }),
        verify: vi.fn().mockResolvedValue({ data: null, error: { message: "invalid_code" } }),
      }),
      "f1",
      "000000",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_code");
  });

  it("returns ok when challenge + verify succeed", async () => {
    const r = await verifyEnroll(
      fakeMfa({
        challenge: vi.fn().mockResolvedValue({ data: { id: "c1" }, error: null }),
        verify: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }),
      "f1",
      "123456",
    );
    expect(r.ok).toBe(true);
  });
});

describe("unenrollFactor", () => {
  it("returns ok on success", async () => {
    const r = await unenrollFactor(fakeMfa({ unenroll: vi.fn().mockResolvedValue({ data: {}, error: null }) }), "f1");
    expect(r.ok).toBe(true);
  });
});

describe("isAal2Verified", () => {
  it("true when current level is aal2", async () => {
    const r = await isAal2Verified(
      fakeMfa({ getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: "aal2" } }) }),
    );
    expect(r).toBe(true);
  });
  it("false when current level is aal1", async () => {
    const r = await isAal2Verified(
      fakeMfa({ getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: { currentLevel: "aal1" } }) }),
    );
    expect(r).toBe(false);
  });
});
