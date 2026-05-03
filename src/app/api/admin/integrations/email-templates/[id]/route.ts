/**
 * DELETE /api/admin/integrations/email-templates/[id]
 *   → soft-deactivate (is_active=false). The render path falls back
 *   to the built-in default afterwards.
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
      .from("tenant_email_templates")
      .update({ is_active: false })
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (error) return apiInternalError(error, "integrations/email-templates DELETE");
    if (!data) return apiNotFound("template_not_found_or_inactive");

    return apiOk({ ok: true });
  } catch (e) {
    return apiInternalError(e, "integrations/email-templates DELETE");
  }
}
