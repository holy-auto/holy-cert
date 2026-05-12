"use client";

/**
 * POS pre-checkout inventory warning banner.
 *
 * Calls POST /api/admin/pos/inventory-warnings whenever the cart items
 * change (debounced 300ms) and surfaces low_stock / out_of_stock /
 * inactive items. Renders nothing while warnings are empty so the
 * banner never adds visual noise to a clean cart.
 *
 * The `items` prop should mirror what will be sent to pos_checkout as
 * `items_json` — line items that have an `inventory_item_id` are checked,
 * others (free-form labour / service lines) are silently ignored.
 *
 * Roadmap: PR #379 server side. Cart-side `inventory_item_id` linkage
 * (menu master → inventory item) is the next iteration.
 */

import { useEffect, useRef, useState } from "react";

interface ItemWarning {
  inventory_item_id: string;
  name: string;
  current_stock: number;
  min_stock: number;
  requested: number;
  remaining_after: number;
}

interface InventoryWarnings {
  low_stock: ItemWarning[];
  out_of_stock: ItemWarning[];
  inactive: { inventory_item_id: string; name: string }[];
}

const EMPTY: InventoryWarnings = { low_stock: [], out_of_stock: [], inactive: [] };

interface Props {
  /** items_json shape — same as the checkout payload */
  items: Array<Record<string, unknown>>;
}

export function InventoryWarningsBanner({ items }: Props) {
  const [warnings, setWarnings] = useState<InventoryWarnings>(EMPTY);
  // Track the latest request so a slower earlier response can't clobber
  // a fresher one. Re-rendered cart triggers a new req_id; only the
  // newest one is allowed to call setWarnings.
  const reqIdRef = useRef(0);

  useEffect(() => {
    // No inventory-linked line items → never call the server.
    const hasInventoryRef = items.some(
      (it) => typeof (it as { inventory_item_id?: unknown }).inventory_item_id === "string",
    );
    if (!hasInventoryRef) {
      setWarnings(EMPTY);
      return;
    }

    const myId = ++reqIdRef.current;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/pos/inventory-warnings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items_json: items }),
        });
        if (!res.ok) return;
        const body = (await res.json()) as { warnings?: InventoryWarnings };
        if (reqIdRef.current === myId && body.warnings) {
          setWarnings(body.warnings);
        }
      } catch {
        // Soft-fail: a network blip should not block the cashier.
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [items]);

  const hasAnyWarning =
    warnings.low_stock.length > 0 || warnings.out_of_stock.length > 0 || warnings.inactive.length > 0;
  if (!hasAnyWarning) return null;

  return (
    <div className="space-y-2">
      {warnings.out_of_stock.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300"
        >
          <div className="mb-1 font-semibold">在庫不足</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.out_of_stock.map((w) => (
              <li key={w.inventory_item_id}>
                {w.name} — 在庫 {w.current_stock} に対して {w.requested} 必要 (不足: {-w.remaining_after})
              </li>
            ))}
          </ul>
          <div className="mt-1 text-xs text-red-300/80">
            このまま会計しても処理は通りますが、在庫が負の値になります。仕入を確認してください。
          </div>
        </div>
      )}

      {warnings.low_stock.length > 0 && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300"
        >
          <div className="mb-1 font-semibold">最低在庫を下回ります</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {warnings.low_stock.map((w) => (
              <li key={w.inventory_item_id}>
                {w.name} — 会計後 {w.remaining_after} (最低 {w.min_stock})
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.inactive.length > 0 && (
        <div className="rounded-lg border border-border-default bg-surface p-3 text-xs text-muted">
          以下のアイテムは在庫マスタで「停止」になっています: {warnings.inactive.map((w) => w.name).join(", ")}
        </div>
      )}
    </div>
  );
}
