/**
 * POST /api/admin/pos/inventory-warnings — pre-checkout soft-block.
 *
 * Contract:
 *   - 401 unauth / 403 below staff / 429 rate-limited / 400 bad payload
 *   - 200 with `warnings` shape on success
 *   - The helper receives the items_json + tenantId from the resolved caller
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { resolveCallerMock, requireMinRoleMock, checkRateLimitMock, checkInventoryMock } = vi.hoisted(() => ({
  resolveCallerMock: vi.fn(),
  requireMinRoleMock: vi.fn().mockReturnValue(true),
  checkRateLimitMock: vi.fn().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 59 }),
  checkInventoryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({}),
}));

vi.mock("@/lib/auth/checkRole", () => ({
  resolveCallerWithRole: (...args: unknown[]) => resolveCallerMock(...args),
  requireMinRole: (...args: unknown[]) => requireMinRoleMock(...args),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/pos/inventoryWarnings", () => ({
  checkInventoryForPosItems: (...args: unknown[]) => checkInventoryMock(...args),
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

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  setContext: vi.fn(),
}));

import { POST } from "@/app/api/admin/pos/inventory-warnings/route";
import { NextRequest } from "next/server";

function jsonReq(body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/pos/inventory-warnings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/admin/pos/inventory-warnings", () => {
  beforeEach(() => {
    resolveCallerMock.mockReset();
    requireMinRoleMock.mockReset().mockReturnValue(true);
    checkRateLimitMock.mockReset().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 59 });
    checkInventoryMock.mockReset();
  });

  it("returns 401 when unauthenticated", async () => {
    resolveCallerMock.mockResolvedValueOnce(null);
    const res = await POST(jsonReq({ items_json: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is below staff", async () => {
    resolveCallerMock.mockResolvedValueOnce({ userId: "u-1", tenantId: "t-1" });
    requireMinRoleMock.mockReturnValueOnce(false);
    const res = await POST(jsonReq({ items_json: [] }));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate-limited", async () => {
    resolveCallerMock.mockResolvedValueOnce({ userId: "u-1", tenantId: "t-1" });
    checkRateLimitMock.mockResolvedValueOnce({ allowed: false, retryAfterSec: 1, remaining: 0 });
    const res = await POST(jsonReq({ items_json: [] }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when payload validation fails", async () => {
    resolveCallerMock.mockResolvedValueOnce({ userId: "u-1", tenantId: "t-1" });
    const res = await POST(jsonReq({ items_json: "not an array" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with the warnings the helper produced — passes tenantId from caller", async () => {
    resolveCallerMock.mockResolvedValueOnce({ userId: "u-1", tenantId: "tenant-A" });
    checkInventoryMock.mockResolvedValueOnce({
      low_stock: [],
      out_of_stock: [
        {
          inventory_item_id: "itm-1",
          name: "ワックス",
          current_stock: 2,
          min_stock: 1,
          requested: 5,
          remaining_after: -3,
        },
      ],
      inactive: [],
    });

    const res = await POST(jsonReq({ items_json: [{ inventory_item_id: "itm-1", quantity: 5 }] }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { warnings: { out_of_stock: Array<{ inventory_item_id: string }> } };
    expect(body.warnings.out_of_stock).toHaveLength(1);
    expect(body.warnings.out_of_stock[0].inventory_item_id).toBe("itm-1");

    // helper must have been invoked with the caller's tenantId
    expect(checkInventoryMock).toHaveBeenCalledWith(
      expect.anything(),
      [{ inventory_item_id: "itm-1", quantity: 5 }],
      "tenant-A",
    );
  });
});
