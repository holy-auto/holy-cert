import { createAdminClient } from "@/lib/supabase/admin";
import { makePublicId } from "@/lib/publicId";

export type PriceSubmission = {
  id: string;
  dealer_id: string;
  service_category: string;
  service_name: string;
  price_min: number | null;
  price_max: number | null;
  price_typical: number | null;
  unit: string;
  notes: string | null;
  prefecture: string;
  created_at: string;
  updated_at: string;
};

export type PriceSubmissionWithDealer = PriceSubmission & {
  dealers: { company_name: string };
};

export type RegionalAverage = {
  prefecture: string;
  service_category: string;
  avg_typical: number;
  avg_min: number;
  avg_max: number;
  count: number;
};

// 自社の価格一覧
export async function getMyPrices(dealerId: string): Promise<PriceSubmission[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_price_submissions")
    .select("*")
    .eq("dealer_id", dealerId)
    .order("service_category")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PriceSubmission[];
}

// 全価格データ（集計用）
export async function getAllPrices(): Promise<PriceSubmissionWithDealer[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_price_submissions")
    .select("*, dealers(company_name)")
    .order("prefecture")
    .order("service_category");

  if (error) throw new Error(error.message);
  return (data ?? []) as PriceSubmissionWithDealer[];
}

// 地域別・カテゴリ別の集計
export function aggregatePrices(prices: PriceSubmission[]): RegionalAverage[] {
  const map = new Map<string, { typical: number[]; min: number[]; max: number[] }>();

  for (const p of prices) {
    const key = `${p.prefecture}__${p.service_category}`;
    if (!map.has(key)) map.set(key, { typical: [], min: [], max: [] });
    const bucket = map.get(key)!;
    if (p.price_typical != null) bucket.typical.push(p.price_typical);
    if (p.price_min     != null) bucket.min.push(p.price_min);
    if (p.price_max     != null) bucket.max.push(p.price_max);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 0 : Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  return Array.from(map.entries()).map(([key, v]) => {
    const [prefecture, service_category] = key.split("__");
    return {
      prefecture,
      service_category,
      avg_typical: avg(v.typical),
      avg_min:     avg(v.min),
      avg_max:     avg(v.max),
      count:       Math.max(v.typical.length, v.min.length, v.max.length),
    };
  });
}

// 価格を登録・更新
export async function upsertPrice(
  dealerId: string,
  prefecture: string,
  input: {
    id?: string;
    service_category: string;
    service_name: string;
    price_min?: number | null;
    price_max?: number | null;
    price_typical?: number | null;
    unit: string;
    notes?: string | null;
  }
): Promise<void> {
  const admin = createAdminClient();

  if (input.id) {
    const { error } = await admin
      .from("shop_price_submissions")
      .update({
        service_category: input.service_category,
        service_name: input.service_name,
        price_min: input.price_min ?? null,
        price_max: input.price_max ?? null,
        price_typical: input.price_typical ?? null,
        unit: input.unit,
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("dealer_id", dealerId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("shop_price_submissions")
      .insert({
        dealer_id: dealerId,
        prefecture,
        service_category: input.service_category,
        service_name: input.service_name,
        price_min: input.price_min ?? null,
        price_max: input.price_max ?? null,
        price_typical: input.price_typical ?? null,
        unit: input.unit,
        notes: input.notes ?? null,
      });
    if (error) throw new Error(error.message);
  }
}

export async function deletePrice(dealerId: string, id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_price_submissions")
    .delete()
    .eq("id", id)
    .eq("dealer_id", dealerId);
  if (error) throw new Error(error.message);
}
