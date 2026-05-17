import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiValidationError, apiInternalError } from "@/lib/api/response";
import { evaluateQualityFlags, type QualityFlagCode } from "@/lib/manufacturers/qualityFlags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Quality scan is a moderately heavy read (joins image counts), so we
// cap the scan window. 2000 most-recent active certificates is plenty
// for ongoing brand monitoring; older issues are historical.
const SCAN_LIMIT = 2000;

const querySchema = z.object({
  flag: z.enum(["no_photos", "no_warranty", "no_service_detail", "no_customer_name"]).optional(),
  tenant_id: z.string().uuid().optional(),
});

type FlaggedCertificate = {
  public_id: string;
  created_at: string;
  tenant_id: string | null;
  tenant_name: string | null;
  template_name: string | null;
  flags: QualityFlagCode[];
};

/**
 * GET /api/manufacturer/quality
 *
 * Scans the manufacturer's recently-issued certificates and returns
 * only those tripping one or more objective quality flags, plus a
 * summary count per flag. Optional ?flag= / ?tenant_id= narrow the
 * list. Read-only; manufacturer-scoped via service role.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "クエリが不正です。");
  }
  const { flag, tenant_id } = parsed.data;

  try {
    const admin = createServiceRoleAdmin("manufacturer quality scan — caller-scoped read filtered by manufacturer_id");
    const manufacturerId = caller.manufacturerId;

    let certQuery = admin
      .from("certificates")
      .select(
        "id, public_id, created_at, customer_name, content_free_text, warranty_period_end, warranty_exclusions, coating_products_json, ppf_coverage_json, maintenance_json, body_repair_json, tenant_id, tenants(name), manufacturer_templates(name)",
      )
      .eq("manufacturer_id", manufacturerId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(SCAN_LIMIT);
    if (tenant_id) certQuery = certQuery.eq("tenant_id", tenant_id);

    const { data: certs, error: certErr } = await certQuery;
    if (certErr) return apiInternalError(certErr, "manufacturer quality scan");

    /* eslint-disable @typescript-eslint/no-explicit-any -- DB JSON columns */
    type CertRow = {
      id: string;
      public_id: string;
      created_at: string;
      customer_name: string | null;
      content_free_text: string | null;
      warranty_period_end: string | null;
      warranty_exclusions: string | null;
      coating_products_json: any;
      ppf_coverage_json: any;
      maintenance_json: any;
      body_repair_json: any;
      tenant_id: string | null;
      tenants: { name: string | null } | { name: string | null }[] | null;
      manufacturer_templates: { name: string | null } | { name: string | null }[] | null;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const rows = (certs ?? []) as unknown as CertRow[];

    // Batch image counts: one query for all certificate ids, then tally
    // in app code instead of N COUNT() round-trips.
    const certIds = rows.map((r) => r.id);
    const imageCount = new Map<string, number>();
    if (certIds.length > 0) {
      const { data: imgs } = await admin
        .from("certificate_images")
        .select("certificate_id")
        .in("certificate_id", certIds)
        .returns<{ certificate_id: string }[]>();
      for (const im of imgs ?? []) {
        imageCount.set(im.certificate_id, (imageCount.get(im.certificate_id) ?? 0) + 1);
      }
    }

    const summary: Record<QualityFlagCode, number> = {
      no_photos: 0,
      no_warranty: 0,
      no_service_detail: 0,
      no_customer_name: 0,
    };
    const flagged: FlaggedCertificate[] = [];

    for (const r of rows) {
      const flags = evaluateQualityFlags({
        customer_name: r.customer_name,
        content_free_text: r.content_free_text,
        warranty_period_end: r.warranty_period_end,
        warranty_exclusions: r.warranty_exclusions,
        coating_products_json: r.coating_products_json,
        ppf_coverage_json: r.ppf_coverage_json,
        maintenance_json: r.maintenance_json,
        body_repair_json: r.body_repair_json,
        image_count: imageCount.get(r.id) ?? 0,
      });
      if (flags.length === 0) continue;
      for (const f of flags) summary[f] += 1;
      if (flag && !flags.includes(flag)) continue;
      const tj = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const mj = Array.isArray(r.manufacturer_templates) ? r.manufacturer_templates[0] : r.manufacturer_templates;
      flagged.push({
        public_id: r.public_id,
        created_at: r.created_at,
        tenant_id: r.tenant_id,
        tenant_name: tj?.name ?? null,
        template_name: mj?.name ?? null,
        flags,
      });
    }

    return apiJson({
      scanned: rows.length,
      scan_limit: SCAN_LIMIT,
      summary,
      flagged,
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer quality GET");
  }
}
