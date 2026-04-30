/**
 * 顧客 AI サマリの read-or-generate ラッパー。
 *
 * フロー:
 *   1. customer_ai_summaries から行を読む
 *   2. 行があり signals_hash が一致 & TTL 内 → そのまま返す
 *   3. それ以外 → LLM 生成 → upsert → 返す
 *
 * LLM 失敗時は null を返す。UI は signals だけで動く設計なので機能影響なし。
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CustomerSignals } from "./signals";
import { computeSignalsHash } from "./signalsHash";
import { generateCustomerSummary } from "@/lib/ai/customerNextAction";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 時間

export interface SummaryResult {
  summary: string;
  cached: boolean;
}

export async function getOrCreateCustomerSummary(args: {
  supabase: SupabaseClient;
  tenantId: string;
  customerId: string;
  customerName: string;
  shopName?: string;
  signals: CustomerSignals;
  /** テスト用フック: now を固定したいときに上書き */
  now?: Date;
}): Promise<SummaryResult | null> {
  const now = args.now ?? new Date();
  const hash = await computeSignalsHash(args.signals);

  // 1. 既存レコードを読む
  const { data: existing } = await args.supabase
    .from("customer_ai_summaries")
    .select("signals_hash, summary, generated_at")
    .eq("customer_id", args.customerId)
    .eq("tenant_id", args.tenantId)
    .maybeSingle();

  if (existing && existing.signals_hash === hash) {
    const generatedAt = new Date(existing.generated_at);
    if (now.getTime() - generatedAt.getTime() < TTL_MS) {
      return { summary: existing.summary, cached: true };
    }
  }

  // 2. LLM 呼び出し
  const fresh = await generateCustomerSummary({
    customerName: args.customerName,
    shopName: args.shopName,
    signals: args.signals,
  });
  if (!fresh) return null;

  // 3. upsert (失敗してもサマリ自体は返す)
  try {
    await args.supabase.from("customer_ai_summaries").upsert(
      {
        customer_id: args.customerId,
        tenant_id: args.tenantId,
        signals_hash: hash,
        summary: fresh,
        generated_at: now.toISOString(),
      },
      { onConflict: "customer_id" },
    );
  } catch (err) {
    console.error("[getOrCreateCustomerSummary] upsert failed:", err);
  }

  return { summary: fresh, cached: false };
}
