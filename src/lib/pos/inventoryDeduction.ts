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
 *   - 在庫減算は best-effort + outbox リトライ: インライン失敗時は
 *     `pos.inventory_deduction` topic で outbox に enqueue し、
 *     `cron/outbox-flush` の dispatcher が指数バックオフで再試行する
 *     (AUDIT 2026-05-03 MEDIUM-4 — マルチステップ処理の補償)
 *   - apply_inventory_movement (SECURITY INVOKER) を呼ぶので
 *     RLS が caller の tenant_id を暗黙に確認する
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { enqueueOutboxEvent } from "@/lib/outbox";

/** items_json 行のうち、在庫紐付けがあるものだけ */
export interface PosItemWithInventory {
  inventory_item_id: string;
  quantity?: number;
  name?: string;
}

/** outbox payload — pos.inventory_deduction topic */
export interface InventoryDeductionPayload extends Record<string, unknown> {
  inventory_item_id: string;
  quantity: number;
  reason: string;
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
  /** outbox に積み直された件数 (failed のうち outbox enqueue が成功した数) */
  retryQueued: number;
}

/**
 * Walks items_json, finds rows with `inventory_item_id`, and issues an
 * `apply_inventory_movement(item_id, 'out', quantity)` for each.
 *
 * 失敗した行は `outboxAdmin` が渡されている場合に限り `pos.inventory_deduction`
 * outbox event として enqueue される。dispatcher は cron/outbox-flush に
 * 登録されている。
 *
 * @param supabase user-scoped Supabase client (RLS enforced)
 * @param itemsJson items_json 値 (z.any() で受けたもの)
 * @param context 失敗ログ + outbox enqueue 用 context
 * @returns 集計結果 — 呼び出し側はレシート応答に乗せても良い
 */
export async function deductInventoryForPosItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  itemsJson: unknown,
  context: {
    tenantId: string;
    paymentId?: string | null;
    /**
     * service-role admin client (tenant-scoped)。
     * 渡された場合のみ、失敗行が outbox に enqueue されてリトライ対象になる。
     * 渡されないと従来どおり logger.warn のみ (best-effort で打ち切り)。
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outboxAdmin?: SupabaseClient<any, any, any>;
  },
): Promise<DeductionResult> {
  if (!Array.isArray(itemsJson)) {
    return { attempted: 0, succeeded: 0, failed: 0, retryQueued: 0 };
  }

  const items = itemsJson.filter(hasInventoryRef);
  if (items.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, retryQueued: 0 };
  }

  let succeeded = 0;
  let failed = 0;
  let retryQueued = 0;

  for (const item of items) {
    const quantity = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
    const reason = `pos_checkout${context.paymentId ? `:${context.paymentId}` : ""}`;
    const { error } = await supabase.rpc("apply_inventory_movement", {
      p_item_id: item.inventory_item_id,
      p_type: "out",
      p_quantity: quantity,
      p_reason: reason,
      p_reservation_id: null,
    });
    if (error) {
      failed += 1;
      logger.warn("pos inventory deduction failed (queuing for retry via outbox)", {
        error,
        tenantId: context.tenantId,
        inventoryItemId: item.inventory_item_id,
        quantity,
      });

      if (context.outboxAdmin) {
        const enq = await enqueueOutboxEvent(context.outboxAdmin, {
          tenantId: context.tenantId,
          topic: "pos.inventory_deduction",
          aggregateId: item.inventory_item_id,
          payload: {
            inventory_item_id: item.inventory_item_id,
            quantity,
            reason,
          } satisfies InventoryDeductionPayload,
        });
        if (enq.ok) retryQueued += 1;
      }
    } else {
      succeeded += 1;
    }
  }

  return { attempted: items.length, succeeded, failed, retryQueued };
}

/**
 * Outbox dispatcher for the `pos.inventory_deduction` topic.
 *
 * Retries `apply_inventory_movement(item, 'out', qty)` against the original
 * tenant. The dispatcher is intentionally idempotent at the *deduction* level
 * — `apply_inventory_movement` is allowed to be re-applied because outbox
 * delivery is at-least-once and a single deduction must not be skipped.
 * If the underlying RPC enforces idempotency (e.g. via `reason` matching),
 * downstream double-applies are absorbed there. Otherwise this helper is the
 * compensation safety-net for the rare case where pos_checkout committed but
 * the inline deduction call failed in transit.
 */
export function buildInventoryDeductionDispatcher(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, any, any>,
) {
  return async (row: {
    id: string;
    payload: Record<string, unknown>;
    tenant_id: string;
  }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const payload = row.payload as Partial<InventoryDeductionPayload>;
    const itemId = payload.inventory_item_id;
    const quantity = typeof payload.quantity === "number" && payload.quantity > 0 ? payload.quantity : null;
    const reason = typeof payload.reason === "string" ? payload.reason : "pos_checkout:retry";

    if (!itemId || !quantity) {
      return { ok: false, error: "malformed payload (missing inventory_item_id or quantity)" };
    }

    const { error } = await admin.rpc("apply_inventory_movement", {
      p_item_id: itemId,
      p_type: "out",
      p_quantity: quantity,
      p_reason: reason,
      p_reservation_id: null,
    });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };
}
