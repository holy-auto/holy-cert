/**
 * GET /api/admin/mfa/factors
 *
 * List the MFA factors registered for the current admin session.
 * The UI renders this to let users see and unenroll existing factors.
 */

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiInternalError, apiError } from "@/lib/api/response";
import { listFactors } from "@/lib/auth/mfa";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const r = await listFactors(supabase);
    if (!r.ok) return apiError({ code: "auth_error", message: r.error, status: 400 });

    return apiOk({ factors: r.data });
  } catch (e) {
    return apiInternalError(e, "admin/mfa/factors");
  }
}
