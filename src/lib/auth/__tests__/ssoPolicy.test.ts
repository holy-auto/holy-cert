import { describe, it, expect, vi } from "vitest";
import { checkPasswordSignInAllowed, emailDomain } from "@/lib/auth/ssoPolicy";

/** Builds a fake `admin` that drives the supabase chain to `result` and captures the .eq() filters applied. */
function fakeAdmin(result: { data: unknown; error: unknown }) {
  const filters: Array<{ col: string; val: unknown }> = [];
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      filters.push({ col, val });
      return chain;
    },
    limit: () => chain,
    maybeSingle: () => Promise.resolve(result),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { admin: { from: vi.fn(() => chain) } as any, filters };
}

describe("emailDomain", () => {
  it.each([
    ["user@example.co.jp", "example.co.jp"],
    ["UPPER@CASE.COM", "case.com"],
    ["  spaced@x.org  ", "x.org"],
  ])("extracts %s", (input, expected) => {
    expect(emailDomain(input)).toBe(expected);
  });

  it("returns null for malformed inputs", () => {
    expect(emailDomain("not-an-email")).toBeNull();
    expect(emailDomain("no-at-symbol.com")).toBeNull();
    expect(emailDomain("user@")).toBeNull();
    expect(emailDomain("user@nodot")).toBeNull();
    expect(emailDomain("")).toBeNull();
  });
});

describe("checkPasswordSignInAllowed", () => {
  it("returns allowed=true when email is malformed (fail open, never hits DB)", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });
    const res = await checkPasswordSignInAllowed(admin, "not-an-email");
    expect(res).toEqual({ allowed: true });
    expect(admin.from).not.toHaveBeenCalled();
  });

  it("returns allowed=true when no enforcing tenant matches the email's domain", async () => {
    const { admin, filters } = fakeAdmin({ data: null, error: null });
    const res = await checkPasswordSignInAllowed(admin, "user@example.co.jp");
    expect(res).toEqual({ allowed: true });
    // It must have queried tenants with sso_required=true AND domain=example.co.jp
    expect(admin.from).toHaveBeenCalledWith("tenants");
    expect(filters).toEqual([
      { col: "sso_required", val: true },
      { col: "sso_email_domain", val: "example.co.jp" },
    ]);
  });

  it("returns allowed=false with reason=sso_required when a matching tenant exists", async () => {
    const { admin } = fakeAdmin({
      data: { sso_email_domain: "acme.co.jp" },
      error: null,
    });
    const res = await checkPasswordSignInAllowed(admin, "tanaka@acme.co.jp");
    expect(res).toEqual({
      allowed: false,
      reason: "sso_required",
      tenantSsoDomain: "acme.co.jp",
    });
  });

  it("fails open (allowed=true) on DB error so a transient blip does NOT lock out everyone", async () => {
    const { admin } = fakeAdmin({ data: null, error: { message: "boom" } });
    const res = await checkPasswordSignInAllowed(admin, "user@example.co.jp");
    expect(res).toEqual({ allowed: true });
  });
});
