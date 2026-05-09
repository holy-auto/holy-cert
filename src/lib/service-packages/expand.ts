/**
 * service_packages 展開ロジック。
 *
 * 1 件の package とその items + 紐付き menu_items を渡すと、
 * 案件 (reservations.menu_items_json) や見積に展開できるスナップショット行を
 * 返す。価格戦略 (sum_of_items / fixed / manual) と総額もここで計算する。
 *
 * 純粋関数として切り出すことで Vitest で網羅的に検証できる。
 */

import type { PriceStrategy } from "@/lib/validations/service-package";

export type MenuItemRow = {
  id: string;
  name: string;
  unit_price: number | null;
  tax_category: number | null;
  unit: string | null;
  is_active: boolean;
};

export type PackageItemRow = {
  id: string;
  package_id: string;
  menu_item_id: string;
  quantity: number;
  override_unit_price: number | null;
  is_archived: boolean;
  sort_order: number;
};

export type ServicePackageRow = {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  price_strategy: PriceStrategy;
  fixed_price: number | null;
  recommended_template_id: string | null;
  is_archived: boolean;
};

export type ExpandedItem = {
  menu_item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  tax_category: number;
  unit: string | null;
};

export type ExpandResult = {
  package: {
    id: string;
    name: string;
    category: string;
    price_strategy: PriceStrategy;
    recommended_template_id: string | null;
  };
  items: ExpandedItem[];
  /** 明細合計 (price_strategy に関わらず参考値として返す) */
  items_total: number;
  /** price_strategy に従って算出した最終価格。manual の場合は null。 */
  price: number | null;
};

/**
 * package + items + menu_items を結合して展開結果を組み立てる。
 *
 * - is_archived な package_item は除外
 * - is_active=false の menu_items も除外 (証明書/見積の元として無効品目を運ばない)
 * - menu_items が見つからない場合 (孤児参照) は除外
 * - override_unit_price が NULL の場合は menu_items.unit_price をスナップショット
 * - quantity * 単価 を line_total として保持
 *
 * @param pkg 展開対象パッケージ
 * @param items パッケージの明細 (sort_order でソート済みでなくてよい)
 * @param menuItems 紐付き menu_items を id で引けるマップ or 配列
 */
export function expandServicePackage(
  pkg: ServicePackageRow,
  items: PackageItemRow[],
  menuItems: ReadonlyArray<MenuItemRow> | ReadonlyMap<string, MenuItemRow>,
): ExpandResult {
  const menuMap =
    menuItems instanceof Map ? menuItems : new Map((menuItems as ReadonlyArray<MenuItemRow>).map((m) => [m.id, m]));

  const expanded: ExpandedItem[] = [];
  for (const it of [...items].sort((a, b) => a.sort_order - b.sort_order)) {
    if (it.is_archived) continue;
    const menu = menuMap.get(it.menu_item_id);
    if (!menu) continue; // 孤児参照
    if (menu.is_active === false) continue;

    const unitPrice = it.override_unit_price ?? menu.unit_price ?? 0;
    const qty = Number(it.quantity) || 0;
    if (qty <= 0) continue;

    expanded.push({
      menu_item_id: it.menu_item_id,
      name: menu.name,
      unit_price: unitPrice,
      quantity: qty,
      line_total: Math.round(unitPrice * qty),
      tax_category: menu.tax_category ?? 10,
      unit: menu.unit ?? null,
    });
  }

  const itemsTotal = expanded.reduce((sum, e) => sum + e.line_total, 0);

  let price: number | null;
  switch (pkg.price_strategy) {
    case "fixed":
      price = pkg.fixed_price ?? 0;
      break;
    case "manual":
      price = null;
      break;
    case "sum_of_items":
    default:
      price = itemsTotal;
      break;
  }

  return {
    package: {
      id: pkg.id,
      name: pkg.name,
      category: pkg.category,
      price_strategy: pkg.price_strategy,
      recommended_template_id: pkg.recommended_template_id,
    },
    items: expanded,
    items_total: itemsTotal,
    price,
  };
}

/**
 * 展開結果を reservations.menu_items_json と同じ shape にマップする。
 * { menu_item_id, name, price } を返す (price は line_total = unit_price * quantity)。
 */
export function toReservationMenuItems(
  expanded: ExpandResult,
): Array<{ menu_item_id: string; name: string; price: number }> {
  return expanded.items.map((it) => ({
    menu_item_id: it.menu_item_id,
    name: it.name,
    price: it.line_total,
  }));
}

/**
 * 既存 menu_items_json に新規行を append する。
 * 同一 menu_item_id がすでに含まれている場合はスキップして重複を避ける。
 */
export function appendMenuItemsWithDedup<T extends { menu_item_id?: string | null; name: string; price: number }>(
  existing: T[] | null | undefined,
  additions: T[],
): T[] {
  const out: T[] = Array.isArray(existing) ? [...existing] : [];
  const existingIds = new Set(
    out.map((m) => m.menu_item_id).filter((x): x is string => typeof x === "string" && x.length > 0),
  );
  for (const a of additions) {
    if (a.menu_item_id && existingIds.has(a.menu_item_id)) continue;
    out.push(a);
    if (a.menu_item_id) existingIds.add(a.menu_item_id);
  }
  return out;
}
