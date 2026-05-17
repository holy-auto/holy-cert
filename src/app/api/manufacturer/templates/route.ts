import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/manufacturer/templates
 *
 * Read-only catalog of the manufacturer's certificate templates,
 * including inactive ones so members can see what is queued or
 * retired. Each row is annotated with the certificate count and the
 * latest issue date so manufacturer staff can spot orphaned designs.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  try {
    const admin = createServiceRoleAdmin("manufacturer templates list — caller-scoped read of own templates");
    const manufacturerId = caller.manufacturerId;

    const { data: templates, error: tplErr } = await admin
      .from("manufacturer_templates")
      .select(
        "id, name, description, service_type, layout_key, thumbnail_path, is_active, sort_order, created_at, updated_at",
      )
      .eq("manufacturer_id", manufacturerId)
      .order("is_active", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (tplErr) return apiInternalError(tplErr, "manufacturer templates list");

    const templateIds = (templates ?? []).map((t) => t.id as string);
    type UsageRow = { manufacturer_template_id: string | null; created_at: string };
    const { data: usage } = templateIds.length
      ? await admin
          .from("certificates")
          .select("manufacturer_template_id, created_at")
          .eq("manufacturer_id", manufacturerId)
          .in("manufacturer_template_id", templateIds)
          .returns<UsageRow[]>()
      : { data: [] as UsageRow[] };

    const usageByTemplate = new Map<string, { count: number; latest: string | null }>();
    for (const u of usage ?? []) {
      const key = u.manufacturer_template_id;
      if (!key) continue;
      const cur = usageByTemplate.get(key);
      if (cur) {
        cur.count += 1;
        if (!cur.latest || cur.latest < u.created_at) cur.latest = u.created_at;
      } else {
        usageByTemplate.set(key, { count: 1, latest: u.created_at });
      }
    }

    const entries = (templates ?? []).map((t) => {
      const stat = usageByTemplate.get(t.id as string);
      return {
        ...t,
        certificate_count: stat?.count ?? 0,
        last_issued_at: stat?.latest ?? null,
      };
    });

    return apiJson({ entries });
  } catch (e) {
    return apiInternalError(e, "manufacturer templates GET");
  }
}
