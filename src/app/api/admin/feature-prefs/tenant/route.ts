import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/parseBody";
import { sanitizeFeatureKeys } from "@/lib/features/catalog";

export const dynamic = "force-dynamic";

const tenantGateSchema = z.object({
  disabledFeatures: z.array(z.string()).max(500),
});

/**
 * PUT — replace the tenant-wide disabled-feature list.
 *
 * Owner/admin only (the per-tenant availability gate). Staff/viewer manage
 * their own visibility via /api/admin/feature-prefs but cannot change what
 * the whole tenant may use.
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!requireMinRole(caller, "admin")) {
      return apiForbidden("テナントの機能設定はオーナー / 管理者のみ変更できます。");
    }

    const parsed = await parseJsonBody(req, tenantGateSchema);
    if (!parsed.ok) return parsed.response;

    const disabledFeatures = sanitizeFeatureKeys(parsed.data.disabledFeatures);

    const { admin, tenantId } = createTenantScopedAdmin(caller.tenantId);
    const { error } = await admin.from("tenant_feature_settings").upsert(
      {
        tenant_id: tenantId,
        disabled_features: disabledFeatures,
        updated_by: caller.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id" },
    );
    if (error) return apiInternalError(error, "feature-prefs tenant PUT upsert");

    return apiOk({ disabledFeatures });
  } catch (e: unknown) {
    return apiInternalError(e, "feature-prefs tenant PUT");
  }
}
