import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import type { ManufacturerMembershipRole } from "@/types/manufacturer";

export type ManufacturerCallerInfo = {
  userId: string;
  manufacturerId: string;
  role: ManufacturerMembershipRole;
  displayName: string | null;
};

/**
 * Resolve the current user as an active manufacturer-portal member.
 * Returns null if:
 *   - the user is not signed in,
 *   - they have no manufacturer_memberships row, or
 *   - their membership is deactivated.
 *
 * Mirrors the resolveCallerWithRole pattern used for tenant portals,
 * but scoped to the read-only manufacturer dashboard. The Supabase
 * client is bound to the request's session, so this respects RLS;
 * any service-role escalation should happen explicitly in the calling
 * route after the caller is resolved.
 */
export async function resolveManufacturerCaller(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<ManufacturerCallerInfo | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return null;

  const { data: membership } = await supabase
    .from("manufacturer_memberships")
    .select("manufacturer_id, role, display_name, is_active")
    .eq("user_id", userRes.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.manufacturer_id) return null;

  return {
    userId: userRes.user.id,
    manufacturerId: membership.manufacturer_id as string,
    role: (membership.role as ManufacturerMembershipRole) ?? "viewer",
    displayName: (membership.display_name as string | null) ?? null,
  };
}
