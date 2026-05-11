/**
 * Tests for /api/agent/data-export.
 *
 * Contract:
 *   - 401 when unauthenticated
 *   - 403 (agent_not_found) when get_my_agent_status RPC returns nothing
 *   - 429 on rate limit
 *   - 200 with JSON sections, all filtered by agent_id (no cross-agent leakage)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { getUserMock, rpcMock, checkRateLimitMock, fromMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: () => getUserMock() },
      rpc: (...args: unknown[]) => rpcMock(...args),
    }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({ from: fromMock }),
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

import { GET } from "@/app/api/agent/data-export/route";
import { NextRequest } from "next/server";

function req(): NextRequest {
  return new Request("http://localhost/api/agent/data-export") as unknown as NextRequest;
}

describe("GET /api/agent/data-export", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    rpcMock.mockReset();
    checkRateLimitMock.mockReset().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 2 });
    fromMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns 403 agent_not_found when RPC has no record", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u-1" } } });
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    const res = await GET(req());
    expect(res.status).toBe(403);
  });

  it("returns 429 on rate limit", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u-1" } } });
    rpcMock.mockResolvedValueOnce({ data: [{ agent_id: "agent-A" }], error: null });
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfterSec: 3600, remaining: 0 });
    const res = await GET(req());
    expect(res.status).toBe(429);
  });

  it("returns 200 JSON with sections, filtered by agent_id", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: { id: "u-1" } } });
    rpcMock.mockResolvedValueOnce({ data: { agent_id: "agent-A" }, error: null });

    const eqCalls: Array<{ col: string; val: unknown; table: string }> = [];
    fromMock.mockImplementation((table: string) => {
      if (table === "agents") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => {
              eqCalls.push({ col, val, table });
              return {
                maybeSingle: () => Promise.resolve({ data: { id: "agent-A", company_name: "Acme" }, error: null }),
              };
            },
          }),
        };
      }
      // agent_referrals / agent_commissions / agent_payouts / agent_training_completions
      return {
        select: () => ({
          eq: (col: string, val: unknown) => {
            eqCalls.push({ col, val, table });
            return { limit: () => Promise.resolve({ data: [{ id: `${table}-1`, agent_id: "agent-A" }], error: null }) };
          },
        }),
      };
    });

    const res = await GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain('filename="ledra-agent-export-');

    const body = (await res.json()) as {
      agent: { id: string };
      sections: Record<string, { count: number }>;
    };
    expect(body.agent.id).toBe("agent-A");
    expect(body.sections.agent_referrals.count).toBe(1);
    expect(body.sections.agent_commissions.count).toBe(1);
    expect(body.sections.agent_payouts.count).toBe(1);
    expect(body.sections.agent_training_completions.count).toBe(1);

    // All four section tables must filter by agent_id = "agent-A".
    const tableFilters = eqCalls.filter((c) => c.table.startsWith("agent_"));
    expect(tableFilters.length).toBeGreaterThanOrEqual(4);
    for (const f of tableFilters) {
      expect(f.col).toBe("agent_id");
      expect(f.val).toBe("agent-A");
    }
  });
});
