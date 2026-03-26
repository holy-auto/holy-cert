import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

/** GET: テナントの全車両を取得（顧客情報付き） */
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    let query = supabase
      .from("vehicles")
      .select("id, maker, model, year, plate_display, vin_code, customer_id, customer:customers(id, name)")
      .eq("tenant_id", caller.tenantId)
      .order("created_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      console.error("[admin/vehicles] db_error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ vehicles: vehicles ?? [] });
  } catch (e: any) {
    console.error("admin vehicles list failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
