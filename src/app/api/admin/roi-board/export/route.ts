import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { isPlatformAdmin } from "@/lib/auth/platformAdmin";
import { getRoiBoardSnapshot, snapshotToCsv } from "@/lib/operations/roiBoard";
import { apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/roi-board/export
 *
 * Returns the current ROI board snapshot as a CSV download. Platform admin
 * only — the underlying `feature_metrics_weekly` rows are cross-tenant and
 * must never leak to tenant operators.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!isPlatformAdmin(caller)) return apiForbidden();

    const snapshot = await getRoiBoardSnapshot();
    const csv = snapshotToCsv(snapshot);
    const filename = `feature-roi-board-${snapshot.latest_week ?? "empty"}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return apiInternalError(e, "roi-board.export");
  }
}
