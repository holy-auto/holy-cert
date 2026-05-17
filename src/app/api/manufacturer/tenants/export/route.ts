import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { apiUnauthorized, apiInternalError } from "@/lib/api/response";
import { buildCsv, csvDownloadHeaders } from "@/lib/csv/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/manufacturer/tenants/export
 *
 * CSV of the calling manufacturer's certified contractors with the
 * same aggregation as /api/manufacturer/tenants (total / 90d / last
 * issued). ?include_revoked=1 mirrors the list view's toggle so the
 * export matches what the user sees on screen.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();

  const includeRevoked = new URL(req.url).searchParams.get("include_revoked") === "1";

  try {
    const admin = createServiceRoleAdmin("manufacturer tenants export — caller-scoped CSV of own certifications");
    const manufacturerId = caller.manufacturerId;

    let certQuery = admin
      .from("manufacturer_certified_tenants")
      .select("id, tenant_id, status, certified_at, revoked_at, notes, tenants(name, slug)")
      .eq("manufacturer_id", manufacturerId)
      .order("certified_at", { ascending: false });
    if (!includeRevoked) certQuery = certQuery.eq("status", "active");

    const { data: certifications, error: certErr } = await certQuery;
    if (certErr) return apiInternalError(certErr, "manufacturer tenants export");

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

    const header = [
      "施工店名",
      "slug",
      "認定状態",
      "認定日",
      "解除日",
      "累計発行件数",
      "直近90日発行件数",
      "最終発行日",
      "メモ",
    ];
    const rows = certRows.map((c) => {
      const join = Array.isArray(c.tenants) ? c.tenants[0] : c.tenants;
      const total = totalByTenant.get(c.tenant_id);
      return [
        join?.name ?? "(削除済テナント)",
        join?.slug ?? "",
        c.status === "active" ? "認定中" : "解除済",
        c.certified_at ? c.certified_at.slice(0, 10) : "",
        c.revoked_at ? c.revoked_at.slice(0, 10) : "",
        total?.count ?? 0,
        recentByTenant.get(c.tenant_id) ?? 0,
        total?.latest ? total.latest.slice(0, 10) : "",
        c.notes ?? "",
      ];
    });

    const filename = `certified_tenants_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(buildCsv(header, rows), {
      status: 200,
      headers: csvDownloadHeaders(filename),
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer tenants export");
  }
}
