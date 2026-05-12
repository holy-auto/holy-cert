import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkInventoryForPosItems } from "@/lib/pos/inventoryWarnings";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

interface InventoryRow {
  id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
}

function fakeSupabase(rows: InventoryRow[] | { error: string }) {
  const isError = !Array.isArray(rows);
  return {
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          in: () =>
            Promise.resolve(
              isError
                ? { data: null, error: { message: (rows as { error: string }).error } }
                : { data: rows, error: null },
            ),
        }),
      }),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("checkInventoryForPosItems", () => {
  beforeEach(() => {
    // nothing
  });

  it("returns empty when items_json is not an array", async () => {
    const res = await checkInventoryForPosItems(fakeSupabase([]), null, "t-1");
    expect(res).toEqual({ low_stock: [], out_of_stock: [], inactive: [] });
  });

  it("returns empty when items_json has no inventory-linked rows", async () => {
    const res = await checkInventoryForPosItems(
      fakeSupabase([]),
      [{ name: "サービス料" }, { description: "x" }],
      "t-1",
    );
    expect(res).toEqual({ low_stock: [], out_of_stock: [], inactive: [] });
  });

  it("flags low_stock when requested deduction leaves current < min_stock", async () => {
    const supabase = fakeSupabase([{ id: "itm-1", name: "ワックス", current_stock: 5, min_stock: 3, is_active: true }]);
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-1", quantity: 3 }], "t-1");
    expect(res.low_stock).toHaveLength(1);
    expect(res.low_stock[0]).toMatchObject({
      inventory_item_id: "itm-1",
      requested: 3,
      remaining_after: 2,
      min_stock: 3,
    });
    expect(res.out_of_stock).toHaveLength(0);
  });

  it("flags out_of_stock when remaining_after would be negative", async () => {
    const supabase = fakeSupabase([
      { id: "itm-2", name: "コーティング剤", current_stock: 2, min_stock: 1, is_active: true },
    ]);
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-2", quantity: 5 }], "t-1");
    expect(res.out_of_stock).toHaveLength(1);
    expect(res.out_of_stock[0].remaining_after).toBe(-3);
    // An out_of_stock item should NOT also be in low_stock (the route classifies into exactly one bucket).
    expect(res.low_stock).toHaveLength(0);
  });

  it("flags inactive items separately (likely a stale POS reference)", async () => {
    const supabase = fakeSupabase([
      { id: "itm-3", name: "旧パック", current_stock: 10, min_stock: 0, is_active: false },
    ]);
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-3", quantity: 1 }], "t-1");
    expect(res.inactive).toEqual([{ inventory_item_id: "itm-3", name: "旧パック" }]);
    expect(res.low_stock).toHaveLength(0);
    expect(res.out_of_stock).toHaveLength(0);
  });

  it("aggregates duplicate inventory_item_id across line items (cumulative deduction)", async () => {
    const supabase = fakeSupabase([{ id: "itm-4", name: "下地剤", current_stock: 4, min_stock: 0, is_active: true }]);
    const res = await checkInventoryForPosItems(
      supabase,
      [
        { inventory_item_id: "itm-4", quantity: 3 },
        { inventory_item_id: "itm-4", quantity: 2 },
      ],
      "t-1",
    );
    // Combined request 5 > stock 4 → out_of_stock with remaining_after = -1.
    expect(res.out_of_stock[0].requested).toBe(5);
    expect(res.out_of_stock[0].remaining_after).toBe(-1);
  });

  it("ignores items missing from inventory_items (silently skip)", async () => {
    const supabase = fakeSupabase([]); // empty result
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-missing", quantity: 1 }], "t-1");
    expect(res).toEqual({ low_stock: [], out_of_stock: [], inactive: [] });
  });

  it("returns empty (fail-open) when the DB query errors — UI shows no warning rather than blocking", async () => {
    const supabase = fakeSupabase({ error: "connection lost" });
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-1", quantity: 1 }], "t-1");
    expect(res).toEqual({ low_stock: [], out_of_stock: [], inactive: [] });
  });

  it("defaults missing or non-positive quantity to 1", async () => {
    const supabase = fakeSupabase([{ id: "itm-5", name: "x", current_stock: 1, min_stock: 0, is_active: true }]);
    const res = await checkInventoryForPosItems(supabase, [{ inventory_item_id: "itm-5" }], "t-1");
    // 1 - 1 = 0, min 0 → no warning.
    expect(res.low_stock).toHaveLength(0);
    expect(res.out_of_stock).toHaveLength(0);

    const res2 = await checkInventoryForPosItems(
      fakeSupabase([{ id: "itm-5", name: "x", current_stock: 1, min_stock: 0, is_active: true }]),
      [
        { inventory_item_id: "itm-5", quantity: 0 },
        { inventory_item_id: "itm-5", quantity: -3 },
      ],
      "t-1",
    );
    // Each negative/zero quantity defaults to 1 → total 2 > stock 1 → out_of_stock.
    expect(res2.out_of_stock).toHaveLength(1);
  });
});
