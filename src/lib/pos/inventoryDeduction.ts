/**
 * POS → 在庫連携ヘルパ
 *
 * pos_checkout は payment / receipt / reservation 更新のみを行う。
 * 在庫が紐付いた商品 (`items_json[].inventory_item_id` を持つ行) は
 * このヘルパで POS 会計の後に **個別に** out 動作を発行する。
 *
 * 設計判断:
 *   - pos_checkout 関数本体には触らない (race-condition 対策で
 *     advisory lock を取っているため、責務分離を保つ)
 *   - 在庫減算は best-effort: 失敗してもレシート発行は完了させる
 *     (失敗ログのみ残し、後段でアラートに繋げる)
 *   - apply_inventory_movement (SECURITY INVOKER) を呼ぶので
 *     RLS が caller の tenant_id を暗黙に確認する
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

/** items_json 行のうち、在庫紐付けがあるものだけ */
export interface PosItemWithInventory {
  inventory_item_id: string;
  quantity?: number;
  name?: string;
}

/**
 * Type guard — items_json は any で受け取るので、安全にフィルタする。
 */
function hasInventoryRef(value: unknown): value is PosItemWithInventory {
  if (!value || typeof value !== "object") return false;
  const v = value as { inventory_item_id?: unknown };
  return typeof v.inventory_item_id === "string" && v.inventory_item_id.length > 0;
}

interface DeductionResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

/**
 * Walks items_json, finds rows with `inventory_item_id`, and issues an
 * `apply_inventory_movement(item_id, 'out', quantity)` for each.
 *
 * @param supabase user-scoped Supabase client (RLS enforced)
 * @param itemsJson items_json 値 (z.any() で受けたもの)
 * @param context 失敗ログ用の追加 context
 * @returns 集計結果 — 呼び出し側はレシート応答に乗せても良い
 */
export async function deductInventoryForPosItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  itemsJson: unknown,
  context: { tenantId: string; paymentId?: string | null },
): Promise<DeductionResult> {
  if (!Array.isArray(itemsJson)) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  const items = itemsJson.filter(hasInventoryRef);
  if (items.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  let succeeded = 0;
  let failed = 0;

  for (const item of items) {
    const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
    const { error } = await supabase.rpc("apply_inventory_movement", {
      p_item_id: item.inventory_item_id,
      p_type: "out",
      p_quantity: quantity,
      p_reason: `pos_checkout${context.paymentId ? `:${context.paymentId}` : ""}`,
      p_reservation_id: null,
    });
    if (error) {
      failed += 1;
      logger.warn("pos inventory deduction failed (non-blocking)", {
        error,
        tenantId: context.tenantId,
        inventoryItemId: item.inventory_item_id,
        quantity,
      });
    } else {
      succeeded += 1;
    }
  }

  return { attempted: items.length, succeeded, failed };
}
