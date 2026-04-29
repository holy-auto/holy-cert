/**
 * Generic webhook idempotency claim helper.
 *
 * `webhook_processed_events` テーブルに `(provider, event_id)` で行を挿入し、
 * 一意制約違反 (23505) を「重複イベント＝処理済み」として判定する。
 *
 * 使い方:
 *   const claim = await claimWebhookEvent(supabase, "resend", event.id, event.type);
 *   if (claim === "duplicate") return; // 既に処理済み
 *   if (claim === "error") return 503; // claim 失敗 → 再送依頼
 *   // claim === "claimed" → 通常処理
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimResult = "claimed" | "duplicate" | "error";

export async function claimWebhookEvent(
  supabase: SupabaseClient,
  provider: string,
  eventId: string,
  eventType?: string | null,
): Promise<ClaimResult> {
  if (!eventId) return "error";
  const { error } = await supabase.from("webhook_processed_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType ?? null,
  });
  if (!error) return "claimed";
  // PostgreSQL unique-violation
  if (error.code === "23505") return "duplicate";
  return "error";
}
