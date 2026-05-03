import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTenantByHost, __resetWhiteLabelCacheForTest } from "@/lib/whiteLabel/resolveTenantByHost";

vi.mock("@/lib/upstash", () => ({ getRedis: () => null }));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({
    from: fromMock,
  }),
}));

function rowChain(row: unknown) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    maybeSingle() {
      return Promise.resolve({ data: row, error: null });
    },
  };
}

describe("resolveTenantByHost", () => {
  beforeEach(() => {
    __resetWhiteLabelCacheForTest();
    fromMock.mockReset();
    delete process.env.PLATFORM_HOSTS;
  });

  it("returns null for empty host", async () => {
    expect(await resolveTenantByHost(null)).toBeNull();
    expect(await resolveTenantByHost("")).toBeNull();
  });

  it("treats platform hosts as null without DB hit", async () => {
    expect(await resolveTenantByHost("ledra.co.jp")).toBeNull();
    expect(await resolveTenantByHost("App.Ledra.co.jp:443")).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("treats *.vercel.app as null without DB hit", async () => {
    expect(await resolveTenantByHost("ledra-pr-123.vercel.app")).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns tenant_id for a verified custom domain", async () => {
    fromMock.mockReturnValueOnce(rowChain({ tenant_id: "tenant-xyz", status: "verified" }));
    expect(await resolveTenantByHost("pf.example.co.jp")).toBe("tenant-xyz");
  });

  it("returns null for unknown host (negative caching)", async () => {
    fromMock.mockReturnValueOnce(rowChain(null));
    expect(await resolveTenantByHost("unknown.example.com")).toBeNull();

    // Second call should hit cache — fromMock NOT invoked again.
    expect(await resolveTenantByHost("unknown.example.com")).toBeNull();
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("respects PLATFORM_HOSTS env override", async () => {
    process.env.PLATFORM_HOSTS = "myplatform.test";
    expect(await resolveTenantByHost("myplatform.test")).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });
});
