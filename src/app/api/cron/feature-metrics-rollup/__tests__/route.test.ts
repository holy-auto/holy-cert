/**
 * Tests for /api/cron/feature-metrics-rollup.
 *
 * Heavy database semantics are intentionally NOT mocked end-to-end —
 * we cover:
 *   - the date math (previousIsoWeekRange) at week boundaries
 *   - 401 on cron-auth failure
 *   - 200 + skipped when the cron lock is held
 *   - happy path: dispatchers see the expected feature_id rows on upsert
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { verifyCronRequestMock, sendCronFailureAlertMock, withCronLockMock, fromMock } = vi.hoisted(() => ({
  verifyCronRequestMock: vi.fn(),
  sendCronFailureAlertMock: vi.fn().mockResolvedValue(undefined),
  withCronLockMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/cronAuth", () => ({
  verifyCronRequest: (...args: unknown[]) => verifyCronRequestMock(...args),
}));
vi.mock("@/lib/cronAlert", () => ({
  sendCronFailureAlert: (...args: unknown[]) => sendCronFailureAlertMock(...args),
}));
vi.mock("@/lib/cron/lock", () => ({
  withCronLock: (...args: unknown[]) => withCronLockMock(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({ from: fromMock }),
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

import { GET, __testing } from "@/app/api/cron/feature-metrics-rollup/route";
import { NextRequest } from "next/server";

function req(): NextRequest {
  return new Request("http://localhost/api/cron/feature-metrics-rollup", {
    headers: { authorization: "Bearer test" },
  }) as unknown as NextRequest;
}

describe("previousIsoWeekRange", () => {
  it("returns previous Mon→Sun when run on Monday (production schedule)", () => {
    // Mon 2026-05-11 UTC midnight
    const now = new Date(Date.UTC(2026, 4, 11, 0, 0, 0));
    const r = __testing.previousIsoWeekRange(now);
    expect(r.weekStartDate).toBe("2026-05-04"); // previous Monday
    expect(r.start.toISOString().slice(0, 10)).toBe("2026-05-04");
    // end is start of next Monday - 1ms = 2026-05-10T23:59:59.999Z
    expect(r.end.toISOString()).toBe("2026-05-10T23:59:59.999Z");
  });

  it("returns the SAME previous week when run on Sunday evening (the cron schedule)", () => {
    // Sun 2026-05-10 19:00 UTC = the actual cron firing time
    const now = new Date(Date.UTC(2026, 4, 10, 19, 0, 0));
    const r = __testing.previousIsoWeekRange(now);
    // Sunday is ISO day 7, so "this Monday" = May 4 → previous Monday = April 27
    expect(r.weekStartDate).toBe("2026-04-27");
  });

  it("handles cross-month boundaries correctly", () => {
    // Mon 2026-06-01 → previous week is May 25 → 31
    const now = new Date(Date.UTC(2026, 5, 1));
    const r = __testing.previousIsoWeekRange(now);
    expect(r.weekStartDate).toBe("2026-05-25");
    expect(r.end.toISOString().slice(0, 10)).toBe("2026-05-31");
  });
});

describe("GET /api/cron/feature-metrics-rollup", () => {
  beforeEach(() => {
    verifyCronRequestMock.mockReset().mockReturnValue({ authorized: true });
    sendCronFailureAlertMock.mockClear();
    withCronLockMock.mockReset();
    fromMock.mockReset();
  });

  it("401 when cron auth fails", async () => {
    verifyCronRequestMock.mockReturnValueOnce({ authorized: false, error: "bad sig" });
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(withCronLockMock).not.toHaveBeenCalled();
  });

  it("200 skipped when the cron lock is held", async () => {
    withCronLockMock.mockResolvedValueOnce({ acquired: false });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skipped: string };
    expect(body.skipped).toBe("lock_held");
  });

  it("upserts feature_metrics_weekly rows when aggregation produces tenants", async () => {
    // Each table .from(...).select(...)... resolves to a couple of rows for
    // the first feature (cert.issue). The remaining features return [] so the
    // route is happy with zero rows for them.
    const upsertCalls: Array<{ rows: Record<string, unknown>[]; conflict?: string }> = [];

    fromMock.mockImplementation((table: string) => {
      if (table === "feature_metrics_weekly") {
        return {
          upsert: (rows: Record<string, unknown>[], opts: { onConflict?: string }) => {
            upsertCalls.push({ rows, conflict: opts.onConflict });
            return Promise.resolve({ error: null });
          },
        };
      }

      // Each feature query has a unique chain; return an empty list with a
      // permissive chain so the route ignores the feature without failing.
      const chain = {
        select: () => chain,
        gte: () => chain,
        lte: () => chain,
        not: () => chain,
        then: (resolve: (v: unknown) => unknown) =>
          // First call against `certificates` populates two tenants; the rest are empty.
          Promise.resolve(
            table === "certificates"
              ? {
                  data: [
                    { tenant_id: "t-1", status: "active" },
                    { tenant_id: "t-1", status: "active" },
                    { tenant_id: "t-2", status: "void" },
                  ],
                  error: null,
                }
              : { data: [], error: null },
          ).then(resolve),
      };
      return chain;
    });

    withCronLockMock.mockImplementation(async (_a, _name, _ttl, fn) => ({
      acquired: true,
      value: await fn(),
    }));

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { upserted: number; features: number; week_start: string };
    expect(body.features).toBe(6);
    expect(body.upserted).toBe(2); // t-1 and t-2 for cert.issue

    expect(upsertCalls).toHaveLength(1);
    expect(upsertCalls[0].conflict).toBe("feature_id,tenant_id,week_start");
    expect(upsertCalls[0].rows).toEqual([
      expect.objectContaining({ feature_id: "cert.issue", tenant_id: "t-1", success: 2, failure: 0 }),
      expect.objectContaining({ feature_id: "cert.issue", tenant_id: "t-2", success: 0, failure: 1 }),
    ]);
  });

  it("invokes cron failure alert + 500 when something throws above the catch", async () => {
    withCronLockMock.mockRejectedValueOnce(new Error("lock service down"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(sendCronFailureAlertMock).toHaveBeenCalledWith("feature-metrics-rollup", "lock service down");
  });
});
