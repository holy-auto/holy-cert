import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiJson, apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CertifiedTenantEntry = {
  certification_id: string;
  tenant_id: string;
  tenant_name: string | null;
  tenant_slug: string | null;
  status: "active" | "revoked";
  certified_at: string;
  revoked_at: string | null;
  notes: string | null;
  certificate_count_total: number;
  certificate_count_90d: number;
  last_issued_at: string | null;
};

/**
 * GET /api/manufacturer/tenants
 *
 * Full list of contractors this manufacturer is (or was) certifying,
 * each annotated with the count of certificates they have issued
 * under the manufacturer's design. Used by /manufacturer/tenants.
 *
 * Optional ?include_revoked=1 surfaces previously-revoked
 * certifications for audit purposes.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  const includeRevoked = new URL(req.url).searchParams.get("include_revoked") === "1";

  try {
    const admin = createServiceRoleAdmin("manufacturer tenants list — caller-scoped read of own certifications");
    const manufacturerId = caller.manufacturerId;

    // Pull certifications + tenant name in a single join. The list per
    // manufacturer is expected to be at most a few hundred rows.
    let certQuery = admin
      .from("manufacturer_certified_tenants")
      .select("id, tenant_id, status, certified_at, revoked_at, notes, tenants(name, slug)")
      .eq("manufacturer_id", manufacturerId)
      .order("certified_at", { ascending: false });
    if (!includeRevoked) certQuery = certQuery.eq("status", "active");

    const { data: certifications, error: certErr } = await certQuery;
    if (certErr) return apiInternalError(certErr, "manufacturer tenants list");

    type CertJoinRow = {
      id: string;
      tenant_id: string;
      status: "active" | "revoked";
      certified_at: string;
      revoked_at: string | null;
      notes: string | null;
      tenants: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
    };
    const certRows = (certifications ?? []) as unknown as CertJoinRow[];
    const tenantIds = Array.from(new Set(certRows.map((c) => c.tenant_id)));

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Aggregate certificate counts per (tenant_id) for this manufacturer
    // in two batched queries (total + 90d) instead of N+1.
    type CertSummaryRow = { tenant_id: string; created_at: string };
    const [totalRes, recentRes] = await Promise.all([
      tenantIds.length > 0
        ? admin
            .from("certificates")
            .select("tenant_id, created_at")
            .eq("manufacturer_id", manufacturerId)
            .in("tenant_id", tenantIds)
            .returns<CertSummaryRow[]>()
        : Promise.resolve({ data: [] as CertSummaryRow[], error: null }),
      tenantIds.length > 0
        ? admin
            .from("certificates")
            .select("tenant_id, created_at")
            .eq("manufacturer_id", manufacturerId)
            .in("tenant_id", tenantIds)
            .gte("created_at", ninetyDaysAgo)
            .returns<CertSummaryRow[]>()
        : Promise.resolve({ data: [] as CertSummaryRow[], error: null }),
    ]);

    const totalByTenant = new Map<string, { count: number; latest: string | null }>();
    for (const r of totalRes.data ?? []) {
      const cur = totalByTenant.get(r.tenant_id);
      if (cur) {
        cur.count += 1;
        if (!cur.latest || cur.latest < r.created_at) cur.latest = r.created_at;
      } else {
        totalByTenant.set(r.tenant_id, { count: 1, latest: r.created_at });
      }
    }
    const recentByTenant = new Map<string, number>();
    for (const r of recentRes.data ?? []) {
      recentByTenant.set(r.tenant_id, (recentByTenant.get(r.tenant_id) ?? 0) + 1);
    }

    const entries: CertifiedTenantEntry[] = certRows.map((c) => {
      const join = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants;
      const total = totalByTenant.get(c.tenant_id);
      return {
        certification_id: c.id,
        tenant_id: c.tenant_id,
        tenant_name: join?.name ?? null,
        tenant_slug: join?.slug ?? null,
        status: c.status,
        certified_at: c.certified_at,
        revoked_at: c.revoked_at,
        notes: c.notes,
        certificate_count_total: total?.count ?? 0,
        certificate_count_90d: recentByTenant.get(c.tenant_id) ?? 0,
        last_issued_at: total?.latest ?? null,
      };
    });

    return apiJson({ entries });
  } catch (e) {
    return apiInternalError(e, "manufacturer tenants GET");
  }
}
