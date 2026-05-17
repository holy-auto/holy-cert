import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import { createSignedAssetUrl } from "@/lib/signedUrl";
import { renderCertificationCertificatePdf } from "@/lib/manufacturers/certificationPdf";
import { apiUnauthorized, apiForbidden, apiValidationError, apiNotFound, apiInternalError } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/manufacturer/certification-pdf?id=<certification_id>
 *
 * Generates a formal 認定施工店証 PDF for one active certification.
 * admin only. The certification row must belong to the caller's
 * manufacturer and be active — you cannot print a cert for a revoked
 * or another manufacturer's relationship.
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("認定証の発行は admin ロールのみ実行できます。");

  const idParam = new URL(req.url).searchParams.get("id") ?? "";
  if (!z.string().uuid().safeParse(idParam).success) {
    return apiValidationError("認定IDが不正です。");
  }

  try {
    const admin = createServiceRoleAdmin("manufacturer certification PDF — admin caller scoped to own manufacturer_id");
    const manufacturerId = caller.manufacturerId;

    const { data: cert } = await admin
      .from("manufacturer_certified_tenants")
      .select("id, status, certified_at, tenants(name)")
      .eq("id", idParam)
      .eq("manufacturer_id", manufacturerId)
      .maybeSingle();
    if (!cert) return apiNotFound("認定が見つかりません。");
    if (cert.status !== "active") {
      return apiValidationError("解除済みの認定では認定証を発行できません。");
    }

    const { data: mfr } = await admin
      .from("manufacturers")
      .select("name, logo_asset_path")
      .eq("id", manufacturerId)
      .maybeSingle();
    if (!mfr) return apiNotFound("メーカー情報が見つかりません。");

    const tenantsJoin = (cert as { tenants: { name: string | null } | { name: string | null }[] | null }).tenants;
    const tj = Array.isArray(tenantsJoin) ? tenantsJoin[0] : tenantsJoin;
    const tenantName = tj?.name ?? "（名称未設定の施工店）";

    let logoUrl: string | null = null;
    if (mfr.logo_asset_path) {
      try {
        logoUrl = await createSignedAssetUrl(mfr.logo_asset_path as string, 600);
      } catch {
        logoUrl = null;
      }
    }

    const buf = await renderCertificationCertificatePdf({
      manufacturerName: (mfr.name as string) ?? "メーカー",
      manufacturerLogoUrl: logoUrl,
      tenantName,
      certifiedAt: (cert.certified_at as string) ?? new Date().toISOString(),
      certificationId: cert.id as string,
    });

    const safeName = tenantName.replace(/[^\p{L}\p{N}_-]/gu, "_").slice(0, 40);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="certified_installer_${safeName}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return apiInternalError(e, "manufacturer certification-pdf GET");
  }
}
