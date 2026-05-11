/**
 * Tests for /api/insurer/data-export.
 *
 * Contract:
 *   - 401 when resolveInsurerCaller returns null
 *   - 403 when caller's role is not "admin" (viewer / auditor blocked)
 *   - 429 on rate limit
 *   - 200 with JSON sections, all filtered by insurer_id
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveInsurerCallerMock, checkRateLimitMock, fromMock } = vi.hoisted(() => ({
  resolveInsurerCallerMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/api/insurerAuth", () => ({
  resolveInsurerCaller: (...args: unknown[]) => resolveInsurerCallerMock(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createInsurerScopedAdmin: (insurerId: string) => ({
    admin: { from: fromMock },
    insurerId,
  }),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getClientIp: () => "127.0.0.1",
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

import { GET } from "@/app/api/insurer/data-export/route";
import { NextRequest } from "next/server";

function req(): NextRequest {
  return new Request("http://localhost/api/insurer/data-export") as unknown as NextRequest;
}

describe("GET /api/insurer/data-export", () => {
  beforeEach(() => {
    resolveInsurerCallerMock.mockReset();
    checkRateLimitMock.mockReset().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 2 });
    fromMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    resolveInsurerCallerMock.mockResolvedValueOnce(null);
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it.each(["viewer", "auditor"])("returns 403 when role is %s (not admin)", async (role) => {
    resolveInsurerCallerMock.mockResolvedValueOnce({
      userId: "u-1",
      insurerId: "ins-A",
      insurerUserId: "iu-1",
      role,
      planTier: "starter",
      insurerStatus: "active",
    });
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it("returns 429 on rate limit", async () => {
    resolveInsurerCallerMock.mockResolvedValueOnce({
      userId: "u-1",
      insurerId: "ins-A",
      insurerUserId: "iu-1",
      role: "admin",
      planTier: "starter",
      insurerStatus: "active",
    });
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfterSec: 3600, remaining: 0 });
    const res = await GET(req());
    expect(res.status).toBe(429);
  });

  it("returns 200 JSON with sections, filtered by insurer_id", async () => {
    resolveInsurerCallerMock.mockResolvedValueOnce({
      userId: "u-1",
      insurerId: "ins-A",
      insurerUserId: "iu-1",
      role: "admin",
      planTier: "starter",
      insurerStatus: "active",
    });

    const eqCalls: Array<{ col: string; val: unknown; table: string }> = [];
    fromMock.mockImplementation((table: string) => ({
      select: () => ({
        eq: (col: string, val: unknown) => {
          eqCalls.push({ col, val, table });
          if (table === "insurers") {
            return { maybeSingle: () => Promise.resolve({ data: { id: "ins-A", name: "Demo Insurer" }, error: null }) };
          }
          return {
            limit: () => Promise.resolve({ data: [{ id: `${table}-1`, insurer_id: "ins-A" }], error: null }),
          };
        },
      }),
    }));

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain('filename="ledra-insurer-export-');

    const body = (await res.json()) as {
      insurer: { id: string };
      sections: Record<string, { count: number }>;
      exported_by: { user_id: string; role: string };
    };
    expect(body.insurer.id).toBe("ins-A");
    expect(body.sections.insurer_users.count).toBe(1);
    expect(body.sections.insurer_cases.count).toBe(1);
    expect(body.sections.insurer_tenant_contracts.count).toBe(1);
    expect(body.sections.insurer_access_logs.count).toBe(1);
    expect(body.exported_by.role).toBe("admin");

    // Every section query must filter on insurer_id (the 4 sections) or id (insurers row).
    for (const call of eqCalls) {
      if (call.table === "insurers") expect(call.col).toBe("id");
      else expect(call.col).toBe("insurer_id");
      expect(call.val).toBe("ins-A");
    }
  });
});
