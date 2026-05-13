/**
 * Per-tenant Polygon anchoring opt-out lookup.
 *
 * Two-layer control model (see migration
 * `20260514000001_tenants_polygon_anchor_opt_out.sql`):
 *
 *   1. **Global env** `POLYGON_ANCHOR_ENABLED` — kill switch. Must be
 *      "true" for any anchoring to happen. Default OFF for dev safety.
 *   2. **Tenant flag** `tenants.polygon_anchor_opt_out` — per-tenant
 *      override. Default `false` (= anchor), so the production behaviour
 *      after `POLYGON_ANCHOR_ENABLED=true` is "default ON for every
 *      tenant unless they explicitly opt out".
 *
 * Fail-closed: any DB error returns `true` (opted-out) so an unreachable
 * Supabase doesn't silently start anchoring rows under unclear intent.
 */

// Accept `any` for the supabase argument: the production caller passes a
// real PostgrestBuilder (whose generated types are too narrow to match a
// simple structural interface here) and tests pass minimal stubs. Both
// satisfy the same .from().select().eq().maybeSingle() shape, but TS's
// strict mode can't unify them — so we erase the type at the boundary
// and validate inputs at runtime via the typed return below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isPolygonAnchorOptedOut(supabase: any, tenantId: string): Promise<boolean> {
  if (!tenantId) return true; // No tenant context → don't anchor.
  try {
    const { data, error } = (await supabase
      .from("tenants")
      .select("polygon_anchor_opt_out")
      .eq("id", tenantId)
      .maybeSingle()) as {
      data: { polygon_anchor_opt_out: boolean | null } | null;
      error: { message?: string } | null;
    };
    if (error) {
      console.warn("[anchoring] tenant opt-out lookup failed (fail-closed)", error.message ?? error);
      return true;
    }
    // Row missing → tenant doesn't exist; fail-closed.
    if (!data) return true;
    return Boolean(data.polygon_anchor_opt_out);
  } catch (err) {
    console.warn("[anchoring] tenant opt-out lookup threw (fail-closed)", err instanceof Error ? err.message : err);
    return true;
  }
}
