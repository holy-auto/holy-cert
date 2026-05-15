import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiUnauthorized, apiValidationError, apiInternalError } from "@/lib/api/response";
import { buildCsv, csvDownloadHeaders } from "@/lib/csv/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap: a manufacturer export is for reporting, not a data dump.
// 5000 rows covers a year of heavy issuance per manufacturer.
const MAX_ROWS = 5000;

const SERVICE_TYPE_LABELS: Record<string, string> = {
  coating: "コーティング",
  ppf: "PPF",
  maintenance: "整備",
  body_repair: "鈑金塗装",
  general: "汎用",
};

const querySchema = z.object({
  tenant_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  service_type: z.enum(["coating", "ppf", "maintenance", "body_repair", "general"]).optional(),
});

/**
 * GET /api/manufacturer/certificates/export
 *
 * CSV of certificates issued under the manufacturer's design, honoring
 * the same tenant/template/service filters as the on-screen list so
 * "filter then export" produces exactly what the user sees. Customer
 * names are masked (the portal never exposes raw PII).
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
  const { tenant_id, template_id, service_type } = parsed.data;

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer certificates export — caller-scoped CSV filtered by manufacturer_id",
    );
    const manufacturerId = caller.manufacturerId;

    let query = admin
      .from("certificates")
      .select(
        "public_id, customer_name, service_type, created_at, status, manufacturer_template_id, tenants(name), manufacturer_templates(name)",
      )
      .eq("manufacturer_id", manufacturerId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    if (template_id) query = query.eq("manufacturer_template_id", template_id);
    if (service_type) query = query.eq("service_type", service_type);

    const { data, error } = await query;
    if (error) return apiInternalError(error, "manufacturer certificates export");

    type CertJoined = {
      public_id: string;
      customer_name: string | null;
      service_type: string | null;
      created_at: string;
      status: string;
      tenants: { name: string | null } | { name: string | null }[] | null;
      manufacturer_templates: { name: string | null } | { name: string | null }[] | null;
    };

    const header = ["公開ID", "発行日時", "施工店", "テンプレート", "顧客(マスク)", "サービス", "状態"];
    const rows = ((data ?? []) as unknown as CertJoined[]).map((r) => {
      const tj = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const mj = Array.isArray(r.manufacturer_templates) ? r.manufacturer_templates[0] : r.manufacturer_templates;
      return [
        r.public_id,
        r.created_at ? r.created_at.replace("T", " ").slice(0, 16) : "",
        tj?.name ?? "(削除済)",
        mj?.name ?? "",
        maskCustomerName(r.customer_name),
        r.service_type ? (SERVICE_TYPE_LABELS[r.service_type] ?? r.service_type) : "",
        r.status,
      ];
    });

    const filename = `manufacturer_certificates_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(buildCsv(header, rows), {
      status: 200,
      headers: csvDownloadHeaders(filename),
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer certificates export");
  }
}

function maskCustomerName(name: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return parts[0] + " " + "●".repeat(Math.min(parts.slice(1).join("").length, 4));
  }
  if (trimmed.length <= 2) return trimmed[0] + "●";
  return trimmed.slice(0, Math.ceil(trimmed.length / 2)) + "●".repeat(Math.floor(trimmed.length / 2));
}
