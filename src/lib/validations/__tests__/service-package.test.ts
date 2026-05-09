import { describe, it, expect } from "vitest";
import { servicePackageCreateSchema, servicePackageUpdateSchema } from "../service-package";

// Zod v4 enforces RFC-9562: version 1-8 + variant 8/9/a/b. Use a real v4 UUID.
const VALID_UUID = "123e4567-e89b-42d3-a456-426614174000";

describe("servicePackageCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    const r = servicePackageCreateSchema.safeParse({ name: "X" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.category).toBe("general");
      expect(r.data.price_strategy).toBe("sum_of_items");
      expect(r.data.items).toEqual([]);
    }
  });

  it("rejects empty name", () => {
    expect(servicePackageCreateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(servicePackageCreateSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects unknown category", () => {
    const r = servicePackageCreateSchema.safeParse({ name: "X", category: "junk" });
    expect(r.success).toBe(false);
  });

  it("requires fixed_price when price_strategy=fixed", () => {
    const bad = servicePackageCreateSchema.safeParse({ name: "X", price_strategy: "fixed" });
    expect(bad.success).toBe(false);
    const good = servicePackageCreateSchema.safeParse({ name: "X", price_strategy: "fixed", fixed_price: 1000 });
    expect(good.success).toBe(true);
  });

  it("accepts items with valid UUID menu_item_id", () => {
    const r = servicePackageCreateSchema.safeParse({
      name: "X",
      items: [{ menu_item_id: VALID_UUID, quantity: 2 }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects items with non-UUID menu_item_id", () => {
    const r = servicePackageCreateSchema.safeParse({
      name: "X",
      items: [{ menu_item_id: "not-uuid" }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects items with quantity <= 0", () => {
    const r = servicePackageCreateSchema.safeParse({
      name: "X",
      items: [{ menu_item_id: VALID_UUID, quantity: 0 }],
    });
    expect(r.success).toBe(false);
  });
});

describe("servicePackageUpdateSchema", () => {
  it("accepts an empty patch", () => {
    expect(servicePackageUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts is_archived toggle", () => {
    const r = servicePackageUpdateSchema.safeParse({ is_archived: true });
    expect(r.success).toBe(true);
  });

  it("rejects switch to fixed without price", () => {
    const r = servicePackageUpdateSchema.safeParse({ price_strategy: "fixed" });
    expect(r.success).toBe(false);
  });
});
