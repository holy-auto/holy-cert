import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankedTenant = {
  tenant_id: string;
  tenant_name: string | null;
  certificate_count: number;
};

type RecentCertificate = {
  public_id: string;
  customer_name: string | null;
  service_type: string | null;
  created_at: string;
  tenant_name: string | null;
  template_name: string | null;
};

/**
 * GET /api/manufacturer/dashboard
 *
 * Read-only dashboard data scoped to the calling user's manufacturer.
 * Returns:
 *   - manufacturer profile (name, slug, logo path)
 *   - counts: active certifications, templates, certificates issued (total / 30d / month)
 *   - top 10 certified tenants by issuance count (last 90 days)
 *   - 20 most recent certificates issued under the manufacturer
 *
 * The caller is resolved via the request-scoped Supabase client which
 * enforces RLS; the heavy aggregations then use a service-role client
 * filtered explicitly by the caller's manufacturer_id (single tenant
 * boundary, no cross-manufacturer leakage).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  try {
    const admin = createServiceRoleAdmin("manufacturer dashboard — aggregations scoped to caller's manufacturer_id");
    const manufacturerId = caller.manufacturerId;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [
      mfrRes,
      activeCertCountRes,
      revokedCertCountRes,
      templateCountRes,
      certTotalRes,
      cert30dRes,
      certMonthRes,
      recentCertsRes,
      rankingCertsRes,
    ] = await Promise.all([
      admin
        .from("manufacturers")
        .select("id, name, slug, logo_asset_path, website_url")
        .eq("id", manufacturerId)
        .maybeSingle(),
      admin
        .from("manufacturer_certified_tenants")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId)
        .eq("status", "active"),
      admin
        .from("manufacturer_certified_tenants")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId)
        .eq("status", "revoked"),
      admin
        .from("manufacturer_templates")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId)
        .eq("is_active", true),
      admin.from("certificates").select("id", { count: "exact", head: true }).eq("manufacturer_id", manufacturerId),
      admin
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId)
        .gte("created_at", thirtyDaysAgo),
      admin
        .from("certificates")
        .select("id", { count: "exact", head: true })
        .eq("manufacturer_id", manufacturerId)
        .gte("created_at", startOfMonth),
      // Recent 20 certificates with tenant + template joined.
      admin
        .from("certificates")
        .select(
          "public_id, customer_name, service_type, created_at, tenant_id, manufacturer_template_id, tenants(name), manufacturer_templates(name)",
        )
        .eq("manufacturer_id", manufacturerId)
        .order("created_at", { ascending: false })
        .limit(20),
      // Ranking: group manually in app code over last 90 days to stay
      // within RLS-bypassed but tenant-bounded queries. The expected
      // volume per manufacturer is in the hundreds/month, so an
      // explicit fetch + reduce is acceptable here.
      admin
        .from("certificates")
        .select("tenant_id, tenants(name)")
        .eq("manufacturer_id", manufacturerId)
        .gte("created_at", ninetyDaysAgo),
    ]);

    const manufacturer = mfrRes.data ?? null;

    type CertJoined = {
      public_id: string;
      customer_name: string | null;
      service_type: string | null;
      created_at: string;
      tenant_id: string | null;
      manufacturer_template_id: string | null;
      tenants: { name: string | null } | { name: string | null }[] | null;
      manufacturer_templates: { name: string | null } | { name: string | null }[] | null;
    };
    const recentRaw = (recentCertsRes.data ?? []) as unknown as CertJoined[];
    const recent: RecentCertificate[] = recentRaw.map((r) => {
      const tenantJoin = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
      const tplJoin = Array.isArray(r.manufacturer_templates) ? r.manufacturer_templates[0] : r.manufacturer_templates;
      return {
        public_id: r.public_id,
        customer_name: maskCustomerName(r.customer_name),
        service_type: r.service_type,
        created_at: r.created_at,
        tenant_name: tenantJoin?.name ?? null,
        template_name: tplJoin?.name ?? null,
      };
    });

    type RankRow = {
      tenant_id: string | null;
      tenants: { name: string | null } | { name: string | null }[] | null;
    };
    const ranking = aggregateRanking((rankingCertsRes.data ?? []) as unknown as RankRow[]);

    return apiJson({
      manufacturer,
      counts: {
        certified_tenants_active: activeCertCountRes.count ?? 0,
        certified_tenants_revoked: revokedCertCountRes.count ?? 0,
        templates_active: templateCountRes.count ?? 0,
        certificates_total: certTotalRes.count ?? 0,
        certificates_last_30d: cert30dRes.count ?? 0,
        certificates_this_month: certMonthRes.count ?? 0,
      },
      ranking,
      recent_certificates: recent,
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer dashboard GET");
  }
}

function aggregateRanking(
  rows: Array<{
    tenant_id: string | null;
    tenants: { name: string | null } | { name: string | null }[] | null;
  }>,
): RankedTenant[] {
  const counts = new Map<string, { tenant_id: string; tenant_name: string | null; count: number }>();
  for (const r of rows) {
    if (!r.tenant_id) continue;
    const join = Array.isArray(r.tenants) ? r.tenants[0] : r.tenants;
    const name = join?.name ?? null;
    const cur = counts.get(r.tenant_id);
    if (cur) {
      cur.count += 1;
    } else {
      counts.set(r.tenant_id, { tenant_id: r.tenant_id, tenant_name: name, count: 1 });
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((e) => ({
      tenant_id: e.tenant_id,
      tenant_name: e.tenant_name,
      certificate_count: e.count,
    }));
}

/**
 * Manufacturer staff see masked customer names. The /c/[public_id]
 * page already does the same masking publicly; we apply the rule here
 * so the portal never surfaces raw customer PII.
 */
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
