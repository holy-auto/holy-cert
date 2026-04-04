import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/** GET /api/admin/shop/products — アクティブ商品一覧 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const { data, error } = await supabase
      .from("shop_products")
      .select("id, name, description, price, tax_rate, unit, min_quantity, sort_order, is_active, meta, created_at, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) return apiInternalError(error, "shop_products select");

    return apiOk({ products: data ?? [] });
  } catch (e) {
    return apiInternalError(e, "admin/shop/products");
  }
}
