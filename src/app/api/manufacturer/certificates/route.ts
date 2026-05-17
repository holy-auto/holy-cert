import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiValidationError, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  tenant_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  service_type: z.enum(["coating", "ppf", "maintenance", "body_repair", "general"]).optional(),
});

type CertificateListItem = {
  public_id: string;
  customer_name: string | null;
  service_type: string | null;
  created_at: string;
  status: string;
  tenant_id: string;
  tenant_name: string | null;
  template_id: string | null;
  template_name: string | null;
};

/**
 * GET /api/manufacturer/certificates
 *
 * Paginated list of certificates issued under this manufacturer's
 * design. Supports filtering by tenant / template / service_type so
 * the contractor-list page can deep-link into "show me everything
 * 〇〇 has issued for this PPF template".
 *
 * Customer names are masked — the manufacturer staff never needs raw
 * PII to read aggregate operational state.
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
  const { page, tenant_id, template_id, service_type } = parsed.data;

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer certificates list — caller-scoped read filtered by manufacturer_id",
    );
    const manufacturerId = caller.manufacturerId;
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = admin
      .from("certificates")
      .select(
        "public_id, customer_name, service_type, created_at, status, tenant_id, manufacturer_template_id, tenants(name), manufacturer_templates(name)",
        { count: "exact" },
      )
      .eq("manufacturer_id", manufacturerId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    if (template_id) query = query.eq("manufacturer_template_id", template_id);
    if (service_type) query = query.eq("service_type", service_type);

    const { data, count, error } = await query;
    if (error) return apiInternalError(error, "manufacturer certificates list");

    type CertJoined = {
      public_id: string;
      customer_name: string | null;
      service_type: string | null;
      created_at: string;
      status: string;
      tenant_id: string;
      manufacturer_template_id: string | null;
      tenants: { name: string | null } | { name: string | null }[] | null;
      manufacturer_templates: { name: string | null } | { name: string | null }[] | null;
    };
    const items: CertificateListItem[] = ((data ?? []) as unknown as CertJoined[]).map((r) => {
      const tj = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const mj = Array.isArray(r.manufacturer_templates) ? r.manufacturer_templates[0] : r.manufacturer_templates;
      return {
        public_id: r.public_id,
        customer_name: maskCustomerName(r.customer_name),
        service_type: r.service_type,
        created_at: r.created_at,
        status: r.status,
        tenant_id: r.tenant_id,
        tenant_name: tj?.name ?? null,
        template_id: r.manufacturer_template_id,
        template_name: mj?.name ?? null,
      };
    });

    return apiJson({
      items,
      page,
      page_size: PAGE_SIZE,
      total: count ?? items.length,
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer certificates GET");
  }
}

function maskCustomerName(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return parts[0] + " " + "●".repeat(Math.min(parts.slice(1).join("").length, 4));
  }
  if (trimmed.length <= 2) return trimmed[0] + "●";
  return trimmed.slice(0, Math.ceil(trimmed.length / 2)) + "●".repeat(Math.floor(trimmed.length / 2));
}
