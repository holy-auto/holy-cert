import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { getAdminClient } from "@/lib/api/auth";
import {
  apiOk,
  apiUnauthorized,
  apiInternalError,
} from "@/lib/api/response";

export const dynamic = "force-dynamic";

// ─── GET: Square インポート済みオーダー一覧 ───
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const offset = (page - 1) * limit;

    const admin = getAdminClient();

    let query = admin
      .from("square_orders")
      .select(
        "id, square_order_id, location_id, state, total_amount, currency, order_created_at, customer_id, vehicle_id, certificate_id, note, customers(id, name)",
        { count: "exact" },
      )
      .eq("tenant_id", caller.tenantId)
      .order("order_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) {
      query = query.gte("order_created_at", new Date(from).toISOString());
    }
    if (to) {
      query = query.lte("order_created_at", new Date(to).toISOString());
    }

    const { data: orders, count, error } = await query;

    if (error) {
      console.error("[square orders] query error:", error.message);
      return apiInternalError(error, "square orders GET");
    }

    return apiOk({
      orders: orders ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (e) {
    return apiInternalError(e, "square orders GET");
  }
}
