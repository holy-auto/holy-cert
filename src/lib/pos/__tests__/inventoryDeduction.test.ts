import { describe, it, expect, vi, beforeEach } from "vitest";
import { deductInventoryForPosItems, buildInventoryDeductionDispatcher } from "@/lib/pos/inventoryDeduction";

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

interface FakeAdmin {
  from: ReturnType<typeof vi.fn>;
  rpc?: ReturnType<typeof vi.fn>;
  insertedRows: Array<Record<string, unknown>>;
}

function fakeAdminWithOutbox(insertResult: { error: { message: string } | null } = { error: null }): FakeAdmin {
  const insertedRows: Array<Record<string, unknown>> = [];
  const single = vi.fn().mockResolvedValue({
    data: insertResult.error ? null : { id: "outbox-1" },
    error: insertResult.error,
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn((row: Record<string, unknown>) => {
    insertedRows.push(row);
    return { select };
  });
  const from = vi.fn(() => ({ insert }));
  return { from, insertedRows } as unknown as FakeAdmin;
}

describe("deductInventoryForPosItems", () => {
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    rpc = vi.fn();
  });

  it("returns zeros when items_json is not an array", async () => {
    const res = await deductInventoryForPosItems(fakeSupabase(rpc), null, { tenantId: "t" });
    expect(res).toEqual({ attempted: 0, succeeded: 0, failed: 0, retryQueued: 0 });
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

    expect(res).toEqual({ attempted: 2, succeeded: 2, failed: 0, retryQueued: 0 });
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

  it("counts RPC failures without throwing (no outbox admin → retryQueued=0)", async () => {
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "stock locked" } });

    const items = [{ inventory_item_id: "ok" }, { inventory_item_id: "boom" }];
    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, { tenantId: "t" });

    expect(res).toEqual({ attempted: 2, succeeded: 1, failed: 1, retryQueued: 0 });
  });

  it("enqueues failed deductions to outbox when outboxAdmin is provided", async () => {
    rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "stock locked" } });

    const admin = fakeAdminWithOutbox();
    const items = [
      { inventory_item_id: "ok", quantity: 1 },
      { inventory_item_id: "boom", quantity: 3 },
    ];

    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, {
      tenantId: "tenant-1",
      paymentId: "pay-9",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outboxAdmin: admin as any,
    });

    expect(res).toEqual({ attempted: 2, succeeded: 1, failed: 1, retryQueued: 1 });
    expect(admin.from).toHaveBeenCalledWith("outbox_events");
    expect(admin.insertedRows).toHaveLength(1);
    const row = admin.insertedRows[0];
    expect(row.tenant_id).toBe("tenant-1");
    expect(row.topic).toBe("pos.inventory_deduction");
    expect(row.aggregate_id).toBe("boom");
    expect(row.payload).toEqual({
      inventory_item_id: "boom",
      quantity: 3,
      reason: "pos_checkout:pay-9",
    });
  });

  it("retryQueued stays 0 when the outbox enqueue itself errors", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "stock locked" } });
    const admin = fakeAdminWithOutbox({ error: { message: "outbox down" } });
    const items = [{ inventory_item_id: "boom", quantity: 1 }];

    const res = await deductInventoryForPosItems(fakeSupabase(rpc), items, {
      tenantId: "tenant-1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      outboxAdmin: admin as any,
    });

    expect(res.failed).toBe(1);
    expect(res.retryQueued).toBe(0);
  });
});

describe("buildInventoryDeductionDispatcher", () => {
  it("calls apply_inventory_movement and returns ok on success", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatcher = buildInventoryDeductionDispatcher({ rpc } as any);

    const result = await dispatcher({
      id: "outbox-1",
      tenant_id: "t1",
      payload: { inventory_item_id: "itm-1", quantity: 2, reason: "pos_checkout:pay-1" },
    });

    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("apply_inventory_movement", {
      p_item_id: "itm-1",
      p_type: "out",
      p_quantity: 2,
      p_reason: "pos_checkout:pay-1",
      p_reservation_id: null,
    });
  });

  it("returns ok=false with the error message when RPC fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "still locked" } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatcher = buildInventoryDeductionDispatcher({ rpc } as any);

    const result = await dispatcher({
      id: "outbox-1",
      tenant_id: "t1",
      payload: { inventory_item_id: "itm-1", quantity: 1, reason: "pos_checkout:retry" },
    });

    expect(result).toEqual({ ok: false, error: "still locked" });
  });

  it("rejects malformed payloads without calling RPC", async () => {
    const rpc = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dispatcher = buildInventoryDeductionDispatcher({ rpc } as any);

    const result = await dispatcher({
      id: "outbox-1",
      tenant_id: "t1",
      payload: { quantity: 1 }, // missing inventory_item_id
    });

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
