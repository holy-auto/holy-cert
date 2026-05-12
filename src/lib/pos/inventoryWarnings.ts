/**
 * POS pre-checkout inventory warnings (soft-block).
 *
 * The hard deduction continues to live in `deductInventoryForPosItems`
 * (post-checkout, atomic via RPC). This helper is its complement:
 * **before** confirming a transaction, the UI calls this to surface a
 * yellow/red warning the staff can override. No write side-effects.
 *
 * Audit reference: T3-2 残作業 — 在庫不足時のソフトブロック
 *
 * Output shape:
 *   - `low_stock`     : stock - requested < min_stock (warning, allow continue)
 *   - `out_of_stock`  : stock - requested < 0 (block by default, override possible)
 *   - `inactive`      : item is marked inactive (likely a stale POS reference)
 *
 * The semantics of "block" vs "warn" live in the UI; the server only
 * reports the facts. This matches how the audit defined it: the cashier
 * should be informed but not forced.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

export interface PosItemInput {
  inventory_item_id: string;
  quantity?: number;
  name?: string;
}

export interface ItemWarning {
  inventory_item_id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  requested: number;
  remaining_after: number;
}

export interface InventoryWarnings {
  low_stock: ItemWarning[];
  out_of_stock: ItemWarning[];
  inactive: { inventory_item_id: string; name: string }[];
}

const EMPTY: InventoryWarnings = { low_stock: [], out_of_stock: [], inactive: [] };

function hasInventoryRef(value: unknown): value is PosItemInput {
  if (!value || typeof value !== "object") return false;
  const v = value as { inventory_item_id?: unknown };
  return typeof v.inventory_item_id === "string" && v.inventory_item_id.length > 0;
}

interface InventoryRow {
  id: string;
  name: string;
  current_stock: number | null;
  min_stock: number | null;
  is_active: boolean | null;
}

/**
 * Aggregate requested quantities by inventory_item_id. Same item appearing
 * twice in items_json (multiple line items) is summed so we warn against
 * the cumulative deduction, not each line in isolation.
 */
function aggregateRequested(items: PosItemInput[]): Map<string, { qty: number; name: string }> {
  const acc = new Map<string, { qty: number; name: string }>();
  for (const it of items) {
    const qty = typeof it.quantity === "number" && it.quantity > 0 ? it.quantity : 1;
    const prev = acc.get(it.inventory_item_id);
    if (prev) {
      prev.qty += qty;
    } else {
      acc.set(it.inventory_item_id, { qty, name: it.name ?? it.inventory_item_id });
    }
  }
  return acc;
}

/**
 * Check inventory levels for the items in a pending POS cart.
 *
 * @param supabase  user-scoped or admin client. Caller is responsible for
 *                  scoping by tenant before this is invoked — the .in() filter
 *                  uses item ids that should already belong to the caller's
 *                  tenant via RLS or upstream filtering.
 * @param itemsJson the same `items_json` shape the checkout route accepts
 *                  (typed as unknown because z.any() upstream).
 */
export async function checkInventoryForPosItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  itemsJson: unknown,
  tenantId: string,
): Promise<InventoryWarnings> {
  if (!Array.isArray(itemsJson)) return EMPTY;

  const items = itemsJson.filter(hasInventoryRef);
  if (items.length === 0) return EMPTY;

  const requested = aggregateRequested(items);
  const ids = [...requested.keys()];

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, current_stock, min_stock, is_active")
    .eq("tenant_id", tenantId)
    .in("id", ids);

  if (error) {
    logger.warn("inventory warnings: lookup failed (returning empty, treating as no warning)", {
      tenantId,
      ids: ids.length,
      error: error.message,
    });
    return EMPTY;
  }

  const rows = (data ?? []) as InventoryRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));

  const result: InventoryWarnings = { low_stock: [], out_of_stock: [], inactive: [] };

  for (const [id, { qty, name }] of requested) {
    const row = byId.get(id);
    if (!row) {
      // No row at all = silently skip. Could be a non-inventory line item
      // that someone tagged with an inventory_item_id by accident.
      continue;
    }
    if (row.is_active === false) {
      result.inactive.push({ inventory_item_id: id, name: row.name ?? name });
      continue;
    }
    const current = Number(row.current_stock ?? 0);
    const min = Number(row.min_stock ?? 0);
    const remaining = current - qty;

    if (remaining < 0) {
      result.out_of_stock.push({
        inventory_item_id: id,
        name: row.name ?? name,
        current_stock: current,
        min_stock: min,
        requested: qty,
        remaining_after: remaining,
      });
    } else if (remaining < min) {
      result.low_stock.push({
        inventory_item_id: id,
        name: row.name ?? name,
        current_stock: current,
        min_stock: min,
        requested: qty,
        remaining_after: remaining,
      });
    }
  }

  return result;
}
