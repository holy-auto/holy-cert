import { describe, it, expect, vi } from "vitest";

const orderMock = vi.fn();
const limitMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({ from: fromMock }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { getRoiBoardSnapshot, snapshotToCsv, classifyFeature } from "../roiBoard";

type Row = {
  feature_id: string;
  tenant_id: string;
  week_start: string;
  dau: number;
  wau: number;
  success: number;
  failure: number;
  arr_jpy: number;
  support_load: number;
  computed_at: string;
};

function row(partial: Partial<Row> & Pick<Row, "feature_id" | "tenant_id" | "week_start" | "success">): Row {
  return {
    dau: 0,
    wau: 0,
    failure: 0,
    arr_jpy: 0,
    support_load: 0,
    computed_at: "2026-05-12T19:00:00Z",
    ...partial,
  };
}

function mockRows(rows: Row[]) {
  orderMock.mockReturnValueOnce({ limit: limitMock });
  limitMock.mockResolvedValueOnce({ data: rows, error: null });
}

function mockError(error: { message: string }) {
  orderMock.mockReturnValueOnce({ limit: limitMock });
  limitMock.mockResolvedValueOnce({ data: null, error });
}

describe("classifyFeature", () => {
  it("flags freeze_candidate when tenants <5% AND success <30", () => {
    expect(classifyFeature({ success_total: 5, failure_total: 0, tenants_using: 1, total_tenants_active: 100 })).toBe(
      "freeze_candidate",
    );
  });
  it("flags watch when reach >= 10 but rate < 70%", () => {
    expect(classifyFeature({ success_total: 5, failure_total: 5, tenants_using: 20, total_tenants_active: 100 })).toBe(
      "watch",
    );
  });
  it("returns healthy for high-rate high-coverage features", () => {
    expect(
      classifyFeature({ success_total: 500, failure_total: 10, tenants_using: 60, total_tenants_active: 100 }),
    ).toBe("healthy");
  });
  it("returns healthy when reach is low (insufficient data, not actionable)", () => {
    expect(
      classifyFeature({ success_total: 100, failure_total: 0, tenants_using: 50, total_tenants_active: 100 }),
    ).toBe("healthy");
  });
});

describe("getRoiBoardSnapshot", () => {
  it("returns empty snapshot when DB returns no rows", async () => {
    mockRows([]);
    const snap = await getRoiBoardSnapshot();
    expect(snap.features).toEqual([]);
    expect(snap.latest_week).toBeNull();
    expect(snap.earliest_week).toBeNull();
    expect(snap.total_tenants_active).toBe(0);
  });

  it("returns empty snapshot on DB error (fail soft)", async () => {
    mockError({ message: "rls denied" });
    const snap = await getRoiBoardSnapshot();
    expect(snap.features).toEqual([]);
    expect(snap.total_tenants_active).toBe(0);
  });

  it("groups by feature and sums success/failure across weeks + tenants", async () => {
    mockRows([
      row({ feature_id: "cert.issue", tenant_id: "t1", week_start: "2026-05-04", success: 10, failure: 1 }),
      row({ feature_id: "cert.issue", tenant_id: "t2", week_start: "2026-05-04", success: 20, failure: 0 }),
      row({ feature_id: "cert.issue", tenant_id: "t1", week_start: "2026-05-11", success: 15, failure: 2 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-05-11", success: 100, failure: 5 }),
    ]);
    const snap = await getRoiBoardSnapshot();

    expect(snap.features.length).toBe(2);
    // Sorted by success_total desc — pos (100) before cert.issue (45)
    expect(snap.features[0].feature_id).toBe("pos");
    expect(snap.features[0].success_total).toBe(100);
    expect(snap.features[1].feature_id).toBe("cert.issue");
    expect(snap.features[1].success_total).toBe(45);
    expect(snap.features[1].failure_total).toBe(3);
    expect(snap.features[1].tenants_using).toBe(2);
    expect(snap.total_tenants_active).toBe(2);
    expect(snap.latest_week).toBe("2026-05-11");
    expect(snap.earliest_week).toBe("2026-05-04");
  });

  it("limits to most-recent `weeks` distinct week_starts", async () => {
    mockRows([
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-04-06", success: 1 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-04-13", success: 1 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-04-20", success: 1 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-04-27", success: 1 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-05-04", success: 1 }),
      row({ feature_id: "pos", tenant_id: "t1", week_start: "2026-05-11", success: 99 }),
    ]);
    const snap = await getRoiBoardSnapshot(4);
    expect(snap.features[0].success_total).toBe(99 + 1 + 1 + 1); // last 4 weeks
    expect(snap.features[0].weekly).toHaveLength(4);
    expect(snap.earliest_week).toBe("2026-04-20");
    expect(snap.latest_week).toBe("2026-05-11");
  });

  it("computes success_rate or null when reach=0", async () => {
    mockRows([row({ feature_id: "x", tenant_id: "t1", week_start: "2026-05-11", success: 0 })]);
    const snap = await getRoiBoardSnapshot();
    expect(snap.features[0].success_rate).toBeNull();
  });
});

describe("snapshotToCsv", () => {
  it("emits BOM + header + per-feature rows", () => {
    const csv = snapshotToCsv({
      latest_week: "2026-05-11",
      earliest_week: "2026-04-20",
      total_tenants_active: 2,
      features: [
        {
          feature_id: "cert.issue",
          success_total: 45,
          failure_total: 3,
          tenants_using: 2,
          success_rate: 45 / 48,
          arr_jpy_total: 1000,
          support_load_total: 0,
          weekly: [],
          flag: "healthy",
        },
      ],
    });
    expect(csv.charCodeAt(0)).toBe(0xfeff); // BOM
    expect(csv).toContain("feature_id,success_total");
    expect(csv).toContain("cert.issue,45,3,2,2,0.9375,1000,0,healthy,2026-04-20,2026-05-11");
  });

  it("escapes quotes / commas / newlines in CSV fields", () => {
    const csv = snapshotToCsv({
      latest_week: "2026-05-11",
      earliest_week: "2026-05-11",
      total_tenants_active: 1,
      features: [
        {
          feature_id: 'odd, "name"\nwith newline',
          success_total: 1,
          failure_total: 0,
          tenants_using: 1,
          success_rate: 1,
          arr_jpy_total: 0,
          support_load_total: 0,
          weekly: [],
          flag: "healthy",
        },
      ],
    });
    expect(csv).toContain('"odd, ""name""\nwith newline"');
  });
});
