import { describe, it, expect, vi } from "vitest";
import { generateApiKey, hashKey, extractBearer, resolveTenantApiKey, hasAnyScope } from "@/lib/tenant-api-keys";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));

describe("generateApiKey + hashKey", () => {
  it("returns a key with the lk_live_ prefix and matching hash", () => {
    const { rawKey, prefix, keyHash } = generateApiKey();
    expect(rawKey.startsWith("lk_live_")).toBe(true);
    expect(prefix).toBe(rawKey.slice(0, 12));
    expect(hashKey(rawKey)).toBe(keyHash);
  });

  it("yields different hashes for different keys", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.keyHash).not.toBe(b.keyHash);
  });
});

describe("extractBearer", () => {
  it("pulls the token out of an Authorization header", () => {
    const r = new Request("http://localhost", { headers: { authorization: "Bearer lk_live_abc" } });
    expect(extractBearer(r)).toBe("lk_live_abc");
  });
  it("returns null without header", () => {
    expect(extractBearer(new Request("http://localhost"))).toBeNull();
  });
});

function fakeAdmin(rows: Array<Record<string, unknown>>) {
  let updatePatch: Record<string, unknown> | null = null;
  const admin = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: rows[0] ?? null, error: null });
        },
        update(patch: Record<string, unknown>) {
          updatePatch = patch;
          return {
            eq: () => ({ then: (cb: (x: { error: null }) => void) => cb({ error: null }) }),
          };
        },
      };
    },
  };
  return { admin: admin as unknown as Parameters<typeof resolveTenantApiKey>[0], getUpdate: () => updatePatch };
}

describe("resolveTenantApiKey", () => {
  it("rejects malformed keys without DB lookup", async () => {
    const { admin } = fakeAdmin([]);
    const r = await resolveTenantApiKey(admin, "not-a-key");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("invalid_key_format");
  });

  it("rejects unknown keys", async () => {
    const { admin } = fakeAdmin([]);
    const r = await resolveTenantApiKey(admin, "lk_live_xxxxxxxx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("unknown_key");
  });

  it("rejects revoked keys", async () => {
    const { admin } = fakeAdmin([{ id: "k1", tenant_id: "t1", scopes: [], revoked_at: "2026-01-01T00:00:00Z" }]);
    const r = await resolveTenantApiKey(admin, "lk_live_xxxxxxxx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("revoked");
  });

  it("rejects expired keys", async () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const { admin } = fakeAdmin([{ id: "k1", tenant_id: "t1", scopes: [], expires_at: past }]);
    const r = await resolveTenantApiKey(admin, "lk_live_xxxxxxxx");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("expired");
  });

  it("returns the tenant context for an active key", async () => {
    const { admin } = fakeAdmin([
      { id: "k1", tenant_id: "t1", scopes: ["certificates:read"], revoked_at: null, expires_at: null },
    ]);
    const r = await resolveTenantApiKey(admin, "lk_live_xxxxxxxx");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.ctx.tenantId).toBe("t1");
      expect(r.ctx.scopes).toEqual(["certificates:read"]);
    }
  });
});

describe("hasAnyScope", () => {
  it("returns true when wildcard is granted", () => {
    expect(hasAnyScope({ tenantId: "t", keyId: "k", scopes: ["*"] }, "anything")).toBe(true);
  });
  it("returns true when one of the required scopes is present", () => {
    expect(hasAnyScope({ tenantId: "t", keyId: "k", scopes: ["a", "b"] }, "b", "c")).toBe(true);
  });
  it("returns false otherwise", () => {
    expect(hasAnyScope({ tenantId: "t", keyId: "k", scopes: ["a"] }, "b")).toBe(false);
  });
});
