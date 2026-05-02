import { supabase } from "./supabase";

export type AppRole = "super_admin" | "owner" | "admin" | "staff" | "viewer";

export type PlanTier = "mini" | "standard" | "pro";

export interface UserProfile {
  id: string;
  email: string;
  tenantId: string;
  tenantName: string;
  planTier: PlanTier;
  role: AppRole;
  storeIds: string[];
}

/**
 * 現在のユーザーのプロフィール（テナント情報含む）を取得
 */
export async function fetchUserProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership, error } = await supabase
    .from("tenant_memberships")
    .select(
      `
      tenant_id,
      role,
      tenants (
        name,
        plan_tier
      )
    `
    )
    .eq("user_id", user.id)
    .single();

  if (error || !membership) {
    console.error("fetchUserProfile error:", error?.message);
    return null;
  }

  const tenant = membership.tenants as unknown as { name: string; plan_tier: string } | null;

  return {
    id: user.id,
    email: user.email ?? "",
    tenantId: membership.tenant_id,
    tenantName: tenant?.name ?? "",
    planTier: (tenant?.plan_tier ?? "mini") as PlanTier,
    role: membership.role as AppRole,
    storeIds: [],
  };
}

/**
 * ログイン
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

/**
 * ログアウト
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
