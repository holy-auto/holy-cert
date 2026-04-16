import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

let adminClient: AnySupabaseClient | null = null;

/**
 * Returns a lazily-initialized singleton Supabase admin client
 * using the service role key (bypasses RLS).
 *
 * Prefer this over creating ad-hoc clients in individual files.
 */
export function getSupabaseAdmin(): AnySupabaseClient {
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Backward-compatible aliases used by existing code paths
export const createAdminClient = getSupabaseAdmin;
export const supabaseAdmin = /* @__PURE__ */ new Proxy({} as AnySupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin(), prop, receiver);
  },
});

/**
 * Tenant-scoped admin client wrapper.
 *
 * Returns the admin client together with the tenantId that the caller
 * **MUST** use to filter every query.
 *
 * @security **CRITICAL** — The returned `admin` client bypasses RLS and has
 * unrestricted access to ALL tenants. Every query built with this client
 * **MUST** include `.eq("tenant_id", tenantId)` (or an equivalent filter).
 * Failing to do so will cause **cross-tenant data leakage**.
 *
 * @example
 * ```ts
 * const { admin, tenantId } = createTenantScopedAdmin(caller.tenantId);
 * const { data } = await admin
 *   .from("some_table")
 *   .select("*")
 *   .eq("tenant_id", tenantId); // <-- REQUIRED
 * ```
 *
 * @throws {Error} if tenantId is falsy (empty string, null, undefined)
 */
export function createTenantScopedAdmin(tenantId: string) {
  if (!tenantId || typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error(
      "[security] createTenantScopedAdmin called with falsy or empty tenantId. " +
        "This is a critical error — aborting to prevent cross-tenant data leakage.",
    );
  }
  return { admin: getSupabaseAdmin(), tenantId };
}
