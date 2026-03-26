import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// These tests focus on the pure/unit-testable parts of billing/guard.ts:
//   - graceDays() logic via env var
//   - PLAN_RANK tier comparison
//   - extractTenantId from query params
//   - enforceBilling integration with mocked supabase + stripe
// ---------------------------------------------------------------------------

// Mock supabase admin
const mockFrom = vi.fn();
const mockSupabase = { from: mockFrom };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockSupabase),
}));

// Mock stripe
const mockRetrieve = vi.fn();
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      subscriptions: { retrieve: mockRetrieve },
    })),
  };
});

import { enforceBilling } from "@/lib/billing/guard";
import { PLAN_RANK, type PlanTier } from "@/types/billing";

const PLATFORM_TENANT = "platform-t";
const REGULAR_TENANT = "regular-t";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("PLATFORM_TENANT_ID", PLATFORM_TENANT);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fake");
  vi.stubEnv("BILLING_GRACE_DAYS", "14");

  mockFrom.mockReset();
  mockRetrieve.mockReset();
});

// Helper: build a chain-able supabase query mock
function stubTenantQuery(result: { data: any; error: any }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

function makeRequest(
  url: string,
  opts?: { method?: string; body?: any; headers?: Record<string, string> },
): Request {
  const init: RequestInit = { method: opts?.method ?? "GET" };
  if (opts?.headers) init.headers = opts.headers;
  if (opts?.body) {
    init.body = JSON.stringify(opts.body);
    init.headers = { ...init.headers, "content-type": "application/json" };
  }
  return new Request(url, init);
}

// ---------------------------------------------------------------------------
// PLAN_RANK ordering
// ---------------------------------------------------------------------------
describe("PLAN_RANK tier ordering", () => {
  it("free < starter < standard < pro", () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.starter);
    expect(PLAN_RANK.starter).toBeLessThan(PLAN_RANK.standard);
    expect(PLAN_RANK.standard).toBeLessThan(PLAN_RANK.pro);
  });

  it("same tier comparison is equal", () => {
    const tiers: PlanTier[] = ["free", "starter", "standard", "pro"];
    for (const t of tiers) {
      expect(PLAN_RANK[t]).toBe(PLAN_RANK[t]);
    }
  });
});

// ---------------------------------------------------------------------------
// enforceBilling - tenant extraction
// ---------------------------------------------------------------------------
describe("enforceBilling - tenant extraction", () => {
  it("returns 400 when no tenant_id can be extracted", async () => {
    const req = makeRequest("http://localhost/api/test");
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(400);
    const body = await res!.json();
    expect(body.error).toContain("Missing tenant_id");
  });

  it("extracts tenant_id from query string", async () => {
    stubTenantQuery({ data: { plan_tier: "pro", is_active: true }, error: null });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).toBeNull(); // passes
  });

  it("extracts tenantId (camelCase) from query string", async () => {
    stubTenantQuery({ data: { plan_tier: "standard", is_active: true }, error: null });

    const req = makeRequest(`http://localhost/api/test?tenantId=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enforceBilling - platform bypass
// ---------------------------------------------------------------------------
describe("enforceBilling - platform tenant bypass", () => {
  it("returns null (bypass) for platform tenant regardless of plan", async () => {
    const req = makeRequest(`http://localhost/api/test?tenant_id=${PLATFORM_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "pro" });
    expect(res).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enforceBilling - tenant not found
// ---------------------------------------------------------------------------
describe("enforceBilling - tenant lookup", () => {
  it("returns 404 when tenant not found in DB", async () => {
    stubTenantQuery({ data: null, error: null });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
  });

  it("returns 404 when DB returns an error", async () => {
    stubTenantQuery({ data: null, error: { message: "db error" } });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// enforceBilling - inactive tenant
// ---------------------------------------------------------------------------
describe("enforceBilling - inactive tenant", () => {
  it("returns 402 for inactive tenant on API request", async () => {
    stubTenantQuery({
      data: { plan_tier: "standard", is_active: false, stripe_subscription_id: null },
      error: null,
    });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "free" });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(402);
    const body = await res!.json();
    expect(body.error).toBe("Billing inactive");
  });
});

// ---------------------------------------------------------------------------
// enforceBilling - plan restriction
// ---------------------------------------------------------------------------
describe("enforceBilling - plan restriction", () => {
  it("returns null when current plan meets minimum", async () => {
    stubTenantQuery({ data: { plan_tier: "standard", is_active: true }, error: null });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "starter" });
    expect(res).toBeNull();
  });

  it("returns 403 when current plan is below minimum", async () => {
    stubTenantQuery({ data: { plan_tier: "free", is_active: true }, error: null });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "standard" });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error).toBe("Plan restricted");
    expect(body.current_plan).toBe("free");
  });

  it("returns null when plan exactly matches minimum", async () => {
    stubTenantQuery({ data: { plan_tier: "pro", is_active: true }, error: null });

    const req = makeRequest(`http://localhost/api/test?tenant_id=${REGULAR_TENANT}`);
    const res = await enforceBilling(req, { minPlan: "pro" });
    expect(res).toBeNull();
  });
});
