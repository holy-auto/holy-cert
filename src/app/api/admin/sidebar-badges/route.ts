import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { getAdminClient } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sidebar-badges
 *
 * Returns badge counts for sidebar nav items:
 * - reservations_today: count of today's reservations
 * - square_unlinked: count of square orders without customer_id
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();

    // Today's date in JST (UTC+9)
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);
    const today = jstDate.toISOString().slice(0, 10);

    // Count today's reservations (exclude cancelled)
    const reservationsPromise = admin
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", caller.tenantId)
      .eq("scheduled_date", today)
      .neq("status", "cancelled");

    // Count unlinked square orders (no customer_id)
    const squareUnlinkedPromise = admin
      .from("square_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", caller.tenantId)
      .is("customer_id", null);

    const [reservationsRes, squareRes] = await Promise.all([
      reservationsPromise,
      squareUnlinkedPromise,
    ]);

    return NextResponse.json({
      ok: true,
      reservations_today: reservationsRes.count ?? 0,
      square_unlinked: squareRes.count ?? 0,
    });
  } catch (e) {
    console.error("[sidebar-badges] error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
