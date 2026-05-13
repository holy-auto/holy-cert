import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { listEnabledAddons } from "@/lib/billing/addons";
import { apiJson, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const { admin } = createTenantScopedAdmin(caller.tenantId);
    const [tenantRes, userRes, enabledAddons] = await Promise.all([
      supabase.from("tenants").select("id, name, plan_tier").eq("id", caller.tenantId).single(),
      supabase.auth.getUser(),
      // listEnabledAddons fail-closes to an empty Set on DB error, so the
      // sidebar safely falls back to "no add-ons" rather than flashing
      // gated entries that the gate page then bounces away from.
      listEnabledAddons(admin, caller.tenantId),
    ]);

    return apiJson({
      user_id: caller.userId,
      email: userRes.data?.user?.email ?? null,
      tenant_id: caller.tenantId,
      tenant_name: tenantRes.data?.name ?? null,
      plan_tier: tenantRes.data?.plan_tier ?? "free",
      role: caller.role ?? "admin",
      enabled_addons: Array.from(enabledAddons),
    });
  } catch (e: unknown) {
    return apiInternalError(e, "me");
  }
}
