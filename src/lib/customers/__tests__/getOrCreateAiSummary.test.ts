import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateCustomerSummary } from "../getOrCreateAiSummary";
import { deriveSignals, type CustomerSignals } from "../signals";
import { computeSignalsHash } from "../signalsHash";

// AI 呼び出しは mock — テストごとに mockResolvedValueOnce で挙動切替
const generateMock = vi.fn<(..._args: any[]) => Promise<string | null>>(async () => "mocked summary");
vi.mock("@/lib/ai/customerNextAction", () => ({
  generateCustomerSummary: (...args: any[]) => generateMock(...args),
}));

const NOW = new Date("2026-04-30T12:00:00Z");
const TENANT = "t1";
const CUSTOMER = "c1";

function buildSignals(): CustomerSignals {
  return deriveSignals({
    customer: { id: CUSTOMER },
    vehicles: [{ id: "v1" }],
    certificates: [],
    reservations: [],
    invoices: [],
    now: NOW,
  });
}

interface FixtureRow {
  customer_id: string;
  tenant_id: string;
  signals_hash: string;
  summary: string;
  generated_at: string;
}

interface FixtureWorld {
  rows: FixtureRow[];
  upsertCalls: FixtureRow[];
}

function makeSupabaseMock(world: FixtureWorld): any {
  function chain() {
    let mode: "select" | "upsert" = "select";
    const filters: Record<string, any> = {};
    const builder: any = {
      select: () => {
        mode = "select";
        return builder;
      },
      eq: (col: string, val: any) => {
        filters[col] = val;
        return builder;
      },
      maybeSingle: () => {
        const found = world.rows.find(
          (r) => r.customer_id === filters["customer_id"] && r.tenant_id === filters["tenant_id"],
        );
        return Promise.resolve({ data: found ?? null, error: null });
      },
      upsert: (payload: FixtureRow) => {
        mode = "upsert";
        world.upsertCalls.push(payload);
        const idx = world.rows.findIndex((r) => r.customer_id === payload.customer_id);
        if (idx >= 0) world.rows[idx] = payload;
        else world.rows.push(payload);
        return Promise.resolve({ data: null, error: null });
      },
    };
    return builder;
  }
  return { from: () => chain() };
}

describe("getOrCreateCustomerSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateMock.mockResolvedValue("mocked summary");
  });

  it("returns cached summary when hash matches and TTL is fresh", async () => {
    const signals = buildSignals();
    const hash = await computeSignalsHash(signals);
    const world: FixtureWorld = {
      rows: [
        {
          customer_id: CUSTOMER,
          tenant_id: TENANT,
          signals_hash: hash,
          summary: "cached summary",
          generated_at: new Date(NOW.getTime() - 1000).toISOString(),
        },
      ],
      upsertCalls: [],
    };
    const result = await getOrCreateCustomerSummary({
      supabase: makeSupabaseMock(world),
      tenantId: TENANT,
      customerId: CUSTOMER,
      customerName: "山田",
      signals,
      now: NOW,
    });
    expect(result?.summary).toBe("cached summary");
    expect(result?.cached).toBe(true);
    expect(generateMock).not.toHaveBeenCalled();
    expect(world.upsertCalls).toHaveLength(0);
  });

  it("regenerates when the cached hash does not match", async () => {
    const signals = buildSignals();
    const world: FixtureWorld = {
      rows: [
        {
          customer_id: CUSTOMER,
          tenant_id: TENANT,
          signals_hash: "stale-hash",
          summary: "old summary",
          generated_at: new Date(NOW.getTime() - 1000).toISOString(),
        },
      ],
      upsertCalls: [],
    };
    const result = await getOrCreateCustomerSummary({
      supabase: makeSupabaseMock(world),
      tenantId: TENANT,
      customerId: CUSTOMER,
      customerName: "山田",
      signals,
      now: NOW,
    });
    expect(result?.summary).toBe("mocked summary");
    expect(result?.cached).toBe(false);
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(world.upsertCalls).toHaveLength(1);
    expect(world.upsertCalls[0].signals_hash).not.toBe("stale-hash");
  });

  it("regenerates when the cached row is older than TTL even if hash matches", async () => {
    const signals = buildSignals();
    const hash = await computeSignalsHash(signals);
    const world: FixtureWorld = {
      rows: [
        {
          customer_id: CUSTOMER,
          tenant_id: TENANT,
          signals_hash: hash,
          summary: "stale but matching hash",
          generated_at: new Date(NOW.getTime() - 25 * 60 * 60 * 1000).toISOString(), // 25h 前
        },
      ],
      upsertCalls: [],
    };
    const result = await getOrCreateCustomerSummary({
      supabase: makeSupabaseMock(world),
      tenantId: TENANT,
      customerId: CUSTOMER,
      customerName: "山田",
      signals,
      now: NOW,
    });
    expect(result?.summary).toBe("mocked summary");
    expect(result?.cached).toBe(false);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("generates and writes when no cache row exists", async () => {
    const signals = buildSignals();
    const world: FixtureWorld = { rows: [], upsertCalls: [] };
    const result = await getOrCreateCustomerSummary({
      supabase: makeSupabaseMock(world),
      tenantId: TENANT,
      customerId: CUSTOMER,
      customerName: "山田",
      signals,
      now: NOW,
    });
    expect(result?.summary).toBe("mocked summary");
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(world.upsertCalls).toHaveLength(1);
    expect(world.upsertCalls[0].customer_id).toBe(CUSTOMER);
    expect(world.upsertCalls[0].tenant_id).toBe(TENANT);
  });

  it("returns null (and does not throw) when LLM generation fails", async () => {
    const signals = buildSignals();
    const world: FixtureWorld = { rows: [], upsertCalls: [] };
    generateMock.mockResolvedValueOnce(null);
    const result = await getOrCreateCustomerSummary({
      supabase: makeSupabaseMock(world),
      tenantId: TENANT,
      customerId: CUSTOMER,
      customerName: "山田",
      signals,
      now: NOW,
    });
    expect(result).toBeNull();
    expect(world.upsertCalls).toHaveLength(0);
  });
});
