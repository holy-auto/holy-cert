import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { getAdminClient } from "@/lib/api/auth";
import {
  apiOk,
  apiUnauthorized,
  apiInternalError,
} from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── GET: 同期履歴一覧 ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const admin = getAdminClient();
    const { data: runs, error } = await admin
      .from("square_sync_runs")
      .select(
        "id, tenant_id, started_at, finished_at, status, trigger_type, triggered_by, orders_fetched, orders_imported, orders_skipped, errors_json",
      )
      .eq("tenant_id", caller.tenantId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[square sync-runs] query error:", error.message);
      return apiInternalError(error, "square sync-runs GET");
    }

    return apiOk({ runs: runs ?? [] });
  } catch (e) {
    return apiInternalError(e, "square sync-runs GET");
  }
}
