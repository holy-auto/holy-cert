import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { apiJson, apiUnauthorized } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/manufacturer/me
 *
 * Returns the calling user's role + manufacturer id so the UI can
 * decide whether to show admin-only controls (認定の追加 / 解除).
 * The full manufacturer profile lives at /api/manufacturer/dashboard;
 * this endpoint stays minimal and cheap for client-side guards.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  return apiJson({
    user_id: caller.userId,
    manufacturer_id: caller.manufacturerId,
    role: caller.role,
    display_name: caller.displayName,
  });
}
