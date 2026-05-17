import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiForbidden, apiValidationError, apiInternalError } from "@/lib/api/response";
import { escapeIlike } from "@/lib/sanitize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().min(2, "2文字以上で検索してください。").max(120),
});

/**
 * GET /api/manufacturer/tenant-search?q=...
 *
 * Search active tenants by name for the 認定追加 picker. Admin only —
 * non-admin manufacturer members never need to grant certifications.
 *
 * To minimize the blast radius of exposing global tenant names, we:
 *   - require q >= 2 chars,
 *   - cap to 20 results,
 *   - return only id/name/slug (no contact info, no addresses),
 *   - filter out tenants that already have an *active* certification
 *     with the caller's manufacturer (no duplicate hits in the UI).
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("認定操作は admin ロールのみ実行できます。");

  const parsed = querySchema.safeParse({ q: new URL(req.url).searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "クエリが不正です。");
  }
  const q = parsed.data.q;

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer tenant-search — admin-only lookup of candidate contractors for certification",
    );

    const [tenantsRes, existingRes] = await Promise.all([
      admin
        .from("tenants")
        .select("id, name, slug")
        .ilike("name", `%${escapeIlike(q)}%`)
        .eq("is_active", true)
        .order("name", { ascending: true })
        .limit(20),
      admin
        .from("manufacturer_certified_tenants")
        .select("tenant_id")
        .eq("manufacturer_id", caller.manufacturerId)
        .eq("status", "active"),
    ]);

    if (tenantsRes.error) return apiInternalError(tenantsRes.error, "tenant-search tenants");
    if (existingRes.error) return apiInternalError(existingRes.error, "tenant-search existing");

    const alreadyCertified = new Set((existingRes.data ?? []).map((r) => r.tenant_id as string));
    const results = (tenantsRes.data ?? []).filter((t) => !alreadyCertified.has(t.id as string));

    return apiJson({ tenants: results });
  } catch (e) {
    return apiInternalError(e, "tenant-search GET");
  }
}
