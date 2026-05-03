/**
 * DELETE /api/admin/integrations/api-keys/[id] — revoke (sets revoked_at).
 *
 * Soft-revoke (rather than physical delete) so audit trails and last_used_at
 * survive. resolveTenantApiKey() refuses any key with revoked_at != null.
 */

import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { resolveCallerWithRole, requirePermission } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiForbidden, apiNotFound, apiInternalError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!requirePermission(caller, "settings:edit")) return apiForbidden();

    const { admin } = createTenantScopedAdmin(caller.tenantId);
    const { data, error } = await admin
      .from("tenant_api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (error) return apiInternalError(error, "integrations/api-keys DELETE");
    if (!data) return apiNotFound("api_key_not_found_or_already_revoked");

    return apiOk({ ok: true });
  } catch (e) {
    return apiInternalError(e, "integrations/api-keys DELETE");
  }
}
