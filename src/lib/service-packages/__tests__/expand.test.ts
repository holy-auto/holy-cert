import { describe, it, expect } from "vitest";
import {
  expandServicePackage,
  toReservationMenuItems,
  appendMenuItemsWithDedup,
  type MenuItemRow,
  type PackageItemRow,
  type ServicePackageRow,
} from "../expand";

const TENANT = "00000000-0000-0000-0000-000000000001";

function pkg(overrides: Partial<ServicePackageRow> = {}): ServicePackageRow {
  return {
    id: "pkg-1",
    tenant_id: TENANT,
    name: "セラミックコーティング Lv2 標準",
    category: "coating",
    price_strategy: "sum_of_items",
    fixed_price: null,
    recommended_template_id: null,
    is_archived: false,
    ...overrides,
  };
}

function menu(overrides: Partial<MenuItemRow> = {}): MenuItemRow {
  return {
    id: "m-1",
    name: "ガラスコーティング",
    unit_price: 55000,
    tax_category: 10,
    unit: "式",
    is_active: true,
    ...overrides,
  };
}

function item(overrides: Partial<PackageItemRow> = {}): PackageItemRow {
  return {
    id: "spi-1",
    package_id: "pkg-1",
    menu_item_id: "m-1",
    quantity: 1,
    override_unit_price: null,
    is_archived: false,
    sort_order: 0,
    ...overrides,
  };
}

describe("expandServicePackage — sum_of_items", () => {
  it("sums multiple items by quantity * unit_price", () => {
    const result = expandServicePackage(
      pkg(),
      [
        item({ id: "a", menu_item_id: "m-1", quantity: 1, sort_order: 1 }),
        item({ id: "b", menu_item_id: "m-2", quantity: 2, sort_order: 0 }),
      ],
      [menu({ id: "m-1", unit_price: 55000 }), menu({ id: "m-2", name: "PPF", unit_price: 30000 })],
    );

    expect(result.items).toHaveLength(2);
    // sort_order によって m-2 が先に来ること
    expect(result.items[0].menu_item_id).toBe("m-2");
    expect(result.items[0].line_total).toBe(60000);
    expect(result.items[1].line_total).toBe(55000);
    expect(result.items_total).toBe(115000);
    expect(result.price).toBe(115000);
  });

  it("returns 0 when no items present", () => {
    const result = expandServicePackage(pkg(), [], []);
    expect(result.items).toHaveLength(0);
    expect(result.items_total).toBe(0);
    expect(result.price).toBe(0);
  });

  it("excludes archived package_items from totals", () => {
    const result = expandServicePackage(
      pkg(),
      [item({ id: "a", quantity: 1, is_archived: false }), item({ id: "b", quantity: 1, is_archived: true })],
      [menu({ unit_price: 1000 })],
    );
    expect(result.items).toHaveLength(1);
    expect(result.items_total).toBe(1000);
  });

  it("excludes inactive menu_items even if package_item is active", () => {
    const result = expandServicePackage(
      pkg(),
      [item({ menu_item_id: "active-id" }), item({ id: "x", menu_item_id: "inactive-id" })],
      [menu({ id: "active-id", unit_price: 200 }), menu({ id: "inactive-id", unit_price: 999, is_active: false })],
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].menu_item_id).toBe("active-id");
    expect(result.items_total).toBe(200);
  });

  it("ignores orphan menu_item_id (menu row missing)", () => {
    const result = expandServicePackage(pkg(), [item({ menu_item_id: "missing-id" })], []);
    expect(result.items).toHaveLength(0);
    expect(result.items_total).toBe(0);
  });

  it("uses override_unit_price when provided, falls back to menu price otherwise", () => {
    const result = expandServicePackage(
      pkg(),
      [
        item({ id: "a", menu_item_id: "m-1", quantity: 1, override_unit_price: 99999 }),
        item({ id: "b", menu_item_id: "m-2", quantity: 1, override_unit_price: null }),
      ],
      [menu({ id: "m-1", unit_price: 55000 }), menu({ id: "m-2", unit_price: 30000 })],
    );
    expect(result.items[0].unit_price).toBe(99999); // sort_order 0 → "a"
    expect(result.items[1].unit_price).toBe(30000);
    expect(result.items_total).toBe(99999 + 30000);
  });

  it("treats menu unit_price=null as 0", () => {
    const result = expandServicePackage(pkg(), [item({ quantity: 3 })], [menu({ unit_price: null })]);
    expect(result.items[0].line_total).toBe(0);
    expect(result.items_total).toBe(0);
  });

  it("rejects quantity <= 0", () => {
    const result = expandServicePackage(pkg(), [item({ quantity: 0 }), item({ id: "b", quantity: -1 })], [menu()]);
    expect(result.items).toHaveLength(0);
  });
});

describe("expandServicePackage — fixed", () => {
  it("returns fixed_price regardless of items_total", () => {
    const result = expandServicePackage(
      pkg({ price_strategy: "fixed", fixed_price: 80000 }),
      [item({ quantity: 5 })],
      [menu({ unit_price: 1000 })],
    );
    expect(result.items_total).toBe(5000);
    expect(result.price).toBe(80000);
  });

  it("returns 0 if fixed_price is null (defensive)", () => {
    const result = expandServicePackage(pkg({ price_strategy: "fixed", fixed_price: null }), [], []);
    expect(result.price).toBe(0);
  });
});

describe("expandServicePackage — manual", () => {
  it("returns price=null but still surfaces items_total for reference", () => {
    const result = expandServicePackage(
      pkg({ price_strategy: "manual" }),
      [item({ quantity: 2 })],
      [menu({ unit_price: 1500 })],
    );
    expect(result.items_total).toBe(3000);
    expect(result.price).toBeNull();
  });
});

describe("toReservationMenuItems", () => {
  it("maps to {menu_item_id, name, price=line_total}", () => {
    const result = expandServicePackage(
      pkg(),
      [item({ menu_item_id: "m-1", quantity: 2 })],
      [menu({ id: "m-1", name: "ABC", unit_price: 1000 })],
    );
    const rows = toReservationMenuItems(result);
    expect(rows).toEqual([{ menu_item_id: "m-1", name: "ABC", price: 2000 }]);
  });
});

describe("appendMenuItemsWithDedup", () => {
  it("appends rows that are not already present (by menu_item_id)", () => {
    const existing = [{ menu_item_id: "m-1", name: "既存A", price: 1000 }];
    const additions = [
      { menu_item_id: "m-1", name: "ダブり", price: 999 },
      { menu_item_id: "m-2", name: "新規B", price: 2000 },
    ];
    const out = appendMenuItemsWithDedup(existing, additions);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ menu_item_id: "m-1", name: "既存A", price: 1000 }); // 既存温存
    expect(out[1].menu_item_id).toBe("m-2");
  });

  it("handles null/undefined existing", () => {
    const additions = [{ menu_item_id: "m-1", name: "A", price: 100 }];
    expect(appendMenuItemsWithDedup(null, additions)).toEqual(additions);
    expect(appendMenuItemsWithDedup(undefined, additions)).toEqual(additions);
  });

  it("appends free-text rows (no menu_item_id) without dedup", () => {
    const existing = [{ name: "手入力A", price: 100 }];
    const additions = [{ name: "手入力A", price: 100 }];
    const out = appendMenuItemsWithDedup(existing, additions);
    expect(out).toHaveLength(2);
  });
});
