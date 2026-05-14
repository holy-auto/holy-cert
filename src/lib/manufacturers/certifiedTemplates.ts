// ============================================================
// Certified-manufacturer template resolution
// ============================================================
// Given a tenant, returns the manufacturer templates it is
// allowed to use when issuing certificates. Used by both the
// tenant-side picker API and the certificate create/edit
// validation paths to prevent forging a manufacturer_template_id
// the contractor was never authorized for.

import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import type { ManufacturerRow, ManufacturerTemplateRow } from "@/types/manufacturer";

export type CertifiedTemplateEntry = {
  manufacturer: Pick<ManufacturerRow, "id" | "name" | "slug" | "logo_asset_path">;
  templates: ManufacturerTemplateRow[];
};

/**
 * Returns the manufacturers the tenant currently has an active
 * certification with, each annotated with the manufacturer's
 * active templates.
 *
 * Designed to run from server components and API routes; uses
 * service-role because the tenant-side RLS policies on
 * manufacturer_templates intentionally do not check certification
 * (templates are visible to any authenticated user — the
 * "permission to issue under this template" check lives here, in
 * application code, so the platform admin can preview or
 * reference designs without a certification of their own).
 */
export async function listCertifiedManufacturerTemplates(tenantId: string): Promise<CertifiedTemplateEntry[]> {
  if (!tenantId) return [];

  const admin = createServiceRoleAdmin(
    "manufacturer certifications — tenant-scoped read of certifications + linked templates",
  );

  const { data: certifications, error: certErr } = await admin
    .from("manufacturer_certified_tenants")
    .select("manufacturer_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active");
  if (certErr) throw new Error(`certifications query failed: ${certErr.message}`);

  const manufacturerIds = (certifications ?? []).map((c) => c.manufacturer_id as string);
  if (manufacturerIds.length === 0) return [];

  const [{ data: manufacturers, error: mfrErr }, { data: templates, error: tplErr }] = await Promise.all([
    admin
      .from("manufacturers")
      .select("id, name, slug, logo_asset_path")
      .in("id", manufacturerIds)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    admin
      .from("manufacturer_templates")
      .select("*")
      .in("manufacturer_id", manufacturerIds)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (mfrErr) throw new Error(`manufacturers query failed: ${mfrErr.message}`);
  if (tplErr) throw new Error(`manufacturer_templates query failed: ${tplErr.message}`);

  const byManufacturer = new Map<string, ManufacturerTemplateRow[]>();
  for (const t of (templates ?? []) as ManufacturerTemplateRow[]) {
    const list = byManufacturer.get(t.manufacturer_id) ?? [];
    list.push(t);
    byManufacturer.set(t.manufacturer_id, list);
  }

  return (manufacturers ?? []).map((m) => ({
    manufacturer: m as CertifiedTemplateEntry["manufacturer"],
    templates: byManufacturer.get(m.id as string) ?? [],
  }));
}

/**
 * Returns the resolved manufacturer template if (a) the template
 * exists and is active, (b) its manufacturer is active, and (c)
 * the tenant has an active certification for that manufacturer.
 * Returns null otherwise — used as the authoritative gate before
 * persisting `certificates.manufacturer_template_id` and before
 * rendering a manufacturer-themed PDF.
 */
export async function resolveCertifiedTemplateForTenant(
  tenantId: string,
  manufacturerTemplateId: string,
): Promise<{ manufacturer: ManufacturerRow; template: ManufacturerTemplateRow } | null> {
  if (!tenantId || !manufacturerTemplateId) return null;

  const admin = createServiceRoleAdmin("manufacturer certifications — tenant-scoped resolve of single template");

  const { data: template } = await admin
    .from("manufacturer_templates")
    .select("*")
    .eq("id", manufacturerTemplateId)
    .eq("is_active", true)
    .maybeSingle<ManufacturerTemplateRow>();
  if (!template) return null;

  const { data: manufacturer } = await admin
    .from("manufacturers")
    .select("*")
    .eq("id", template.manufacturer_id)
    .eq("is_active", true)
    .maybeSingle<ManufacturerRow>();
  if (!manufacturer) return null;

  const { data: cert } = await admin
    .from("manufacturer_certified_tenants")
    .select("id")
    .eq("manufacturer_id", manufacturer.id)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();
  if (!cert) return null;

  return { manufacturer, template };
}
