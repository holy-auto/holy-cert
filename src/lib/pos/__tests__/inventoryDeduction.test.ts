import { describe, it, expect, vi, beforeEach } from "vitest";
import { deductInventoryForPosItems } from "@/lib/pos/inventoryDeduction";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

function fakeSupabase(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as Parameters<typeof deductInventoryForPosItems>[0];
}

describe("deductInventoryForPosItems", () => {
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpc = vi.fn();
  });

  it("returns zeros when items_json is not an array", async () => {
    const res = await deductInventoryForPosItems(fakeSupabase(rpc), null, { tenantId: "t" });
    expect(res).toEqual({ attempted: 0, succeeded: 0, failed: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignores rows without inventory_item_id", async () => {
    const items = [
      { name: "サービス料", price: 1000 },
      { name: "備考", description: "x" },
    ];
    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, { tenantId: "t" });
    expect(res.attempted).toBe(0);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("issues an out movement for each inventory-linked item", async () => {
    rpc.mockResolvedValue({ error: null });
    const items = [
      { inventory_item_id: "itm-1", quantity: 2, name: "ワックス" },
      { inventory_item_id: "itm-2", quantity: 1 },
      { name: "no-inventory" },
    ];

    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, {
      tenantId: "t1",
      paymentId: "pay-1",
    });

    expect(res).toEqual({ attempted: 2, succeeded: 2, failed: 0 });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "apply_inventory_movement", {
      p_item_id: "itm-1",
      p_type: "out",
      p_quantity: 2,
      p_reason: "pos_checkout:pay-1",
      p_reservation_id: null,
    });
  });

  it("defaults quantity to 1 when missing or non-positive", async () => {
    rpc.mockResolvedValue({ error: null });
    const items = [
      { inventory_item_id: "itm-1" },
      { inventory_item_id: "itm-2", quantity: 0 },
      { inventory_item_id: "itm-3", quantity: -3 },
    ];

    await deductInventoryForPosItems(fakeSupabase(rpc), items, { tenantId: "t" });
    for (let i = 0; i < 3; i++) {
      expect(rpc.mock.calls[i][1].p_quantity).toBe(1);
    }
  });

  it("counts RPC failures without throwing", async () => {
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "stock locked" } });

    const items = [{ inventory_item_id: "ok" }, { inventory_item_id: "boom" }];
    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, { tenantId: "t" });

    expect(res).toEqual({ attempted: 2, succeeded: 1, failed: 1 });
  });
});
