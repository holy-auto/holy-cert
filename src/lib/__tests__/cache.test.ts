/**
 * Tests for src/lib/cache.ts.
 *
 * Contract:
 *   - withCache: fallback to fn() when Redis is unconfigured
 *   - withCache: returns cached value on hit (fn not invoked)
 *   - withCache: stores the result on miss with the correct TTL
 *   - withCache: still returns data when the SET fails (write is best-effort)
 *   - withCache: falls back to fn() when the GET fails (read is best-effort)
 *   - invalidateCache: returns true when Redis is null (nothing to do)
 *   - invalidateCache: returns true on successful DEL
 *   - invalidateByPrefix: walks SCAN cursor + DELs every matched key
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { getRedisMock } = vi.hoisted(() => ({ getRedisMock: vi.fn() }));

vi.mock("@/lib/upstash", () => ({
  getRedis: () => getRedisMock(),
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

import { withCache, invalidateCache, invalidateByPrefix } from "@/lib/cache";

function fakeRedis(
  overrides: Partial<{
    get: (k: string) => Promise<unknown>;
    set: (k: string, v: unknown, opts: { ex: number }) => Promise<unknown>;
    del: (...keys: string[]) => Promise<unknown>;
    scan: (cursor: number | string, opts: { match: string; count: number }) => Promise<[string | number, string[]]>;
  }> = {},
) {
  return {
    get: overrides.get ?? vi.fn().mockResolvedValue(null),
    set: overrides.set ?? vi.fn().mockResolvedValue("OK"),
    del: overrides.del ?? vi.fn().mockResolvedValue(1),
    scan: overrides.scan ?? vi.fn().mockResolvedValue([0, []]),
  };
}

describe("withCache", () => {
  beforeEach(() => {
    getRedisMock.mockReset();
  });

  it("falls back to fn() when Redis is null (dev / CI mode)", async () => {
    getRedisMock.mockReturnValue(null);
    const fn = vi.fn().mockResolvedValue("fresh");
    const v = await withCache("k", 60, fn);
    expect(v).toBe("fresh");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("returns the cached value on hit and does NOT invoke fn()", async () => {
    const redis = fakeRedis({ get: vi.fn().mockResolvedValue({ plan: "standard" }) });
    getRedisMock.mockReturnValue(redis);
    const fn = vi.fn();

    const v = await withCache<{ plan: string }>("k", 60, fn);
    expect(v).toEqual({ plan: "standard" });
    expect(fn).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it("invokes fn() on miss and stores the result with the correct TTL", async () => {
    const set = vi.fn().mockResolvedValue("OK");
    const redis = fakeRedis({ get: vi.fn().mockResolvedValue(null), set });
    getRedisMock.mockReturnValue(redis);
    const fn = vi.fn().mockResolvedValue({ plan: "pro" });

    const v = await withCache<{ plan: string }>("k", 120, fn);
    expect(v).toEqual({ plan: "pro" });
    expect(fn).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith("k", { plan: "pro" }, { ex: 120 });
  });

  it("returns fresh data even when SET fails (write is best-effort)", async () => {
    const redis = fakeRedis({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error("redis down")),
    });
    getRedisMock.mockReturnValue(redis);
    const fn = vi.fn().mockResolvedValue("fresh");

    const v = await withCache("k", 60, fn);
    expect(v).toBe("fresh");
  });

  it("falls back to fn() when GET fails (read is best-effort)", async () => {
    const redis = fakeRedis({
      get: vi.fn().mockRejectedValue(new Error("redis read failed")),
    });
    getRedisMock.mockReturnValue(redis);
    const fn = vi.fn().mockResolvedValue("fresh");

    const v = await withCache("k", 60, fn);
    expect(v).toBe("fresh");
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    getRedisMock.mockReset();
  });

  it("returns true when Redis is null (no-op)", async () => {
    getRedisMock.mockReturnValue(null);
    const v = await invalidateCache("k");
    expect(v).toBe(true);
  });

  it("returns true after a successful DEL", async () => {
    const del = vi.fn().mockResolvedValue(1);
    getRedisMock.mockReturnValue(fakeRedis({ del }));
    const v = await invalidateCache("k");
    expect(v).toBe(true);
    expect(del).toHaveBeenCalledWith("k");
  });

  it("returns false when DEL throws", async () => {
    getRedisMock.mockReturnValue(fakeRedis({ del: vi.fn().mockRejectedValue(new Error("redis down")) }));
    const v = await invalidateCache("k");
    expect(v).toBe(false);
  });
});

describe("invalidateByPrefix", () => {
  beforeEach(() => {
    getRedisMock.mockReset();
  });

  it("returns 0 when Redis is null", async () => {
    getRedisMock.mockReturnValue(null);
    const n = await invalidateByPrefix("tenant-billing:");
    expect(n).toBe(0);
  });

  it("scans + dels every match across multiple cursor rounds", async () => {
    const del = vi.fn().mockResolvedValue(1);
    // First round: cursor 0 → ["10", ["a", "b"]]; second: ["0", ["c"]] (terminator)
    const scan = vi
      .fn()
      .mockResolvedValueOnce(["10", ["a", "b"]])
      .mockResolvedValueOnce(["0", ["c"]]);
    getRedisMock.mockReturnValue(fakeRedis({ del, scan }));

    const n = await invalidateByPrefix("tenant-billing:");
    expect(n).toBe(3);
    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenNthCalledWith(1, "a", "b");
    expect(del).toHaveBeenNthCalledWith(2, "c");
  });

  it("returns partial count when SCAN throws mid-loop", async () => {
    const del = vi.fn().mockResolvedValue(1);
    const scan = vi
      .fn()
      .mockResolvedValueOnce(["5", ["a"]])
      .mockRejectedValueOnce(new Error("redis dropped"));
    getRedisMock.mockReturnValue(fakeRedis({ del, scan }));

    const n = await invalidateByPrefix("k:");
    expect(n).toBe(1); // partial — the first batch went through
  });
});
