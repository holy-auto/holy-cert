import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveManufacturerCaller } from "@/lib/auth/manufacturerCaller";
import { createServiceRoleAdmin } from "@/lib/supabase/admin";
import {
  apiJson,
  apiUnauthorized,
  apiForbidden,
  apiValidationError,
  apiNotFound,
  apiInternalError,
} from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantSchema = z.object({
  tenant_id: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

const revokeSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

/**
 * POST /api/manufacturer/certifications
 *
 * Manufacturer-side self-service grant. admin role only. Records
 * certified_by from the calling user so audit shows the manufacturer
 * staff (not 運営) issued the grant.
 *
 * If a revoked row already exists for the same (manufacturer, tenant)
 * pair, flips it back to active rather than INSERTing — matching the
 * platform-admin endpoint's behavior.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("認定操作は admin ロールのみ実行できます。");

  const parsed = grantSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "入力に誤りがあります。");
  }
  const { tenant_id, notes } = parsed.data;
  const trimmedNotes = (notes ?? "").trim() || null;

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer certifications grant — admin caller scoped to own manufacturer_id",
    );
    const manufacturerId = caller.manufacturerId;

    const { data: tenant } = await admin.from("tenants").select("id, is_active").eq("id", tenant_id).maybeSingle();
    if (!tenant) return apiNotFound("テナントが見つかりません。");
    if (tenant.is_active === false) {
      return apiValidationError("非アクティブなテナントは認定できません。");
    }

    const { data: existing } = await admin
      .from("manufacturer_certified_tenants")
      .select("id, status")
      .eq("manufacturer_id", manufacturerId)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === "active") {
        return apiValidationError("このテナントは既に認定されています。");
      }
      const { data, error } = await admin
        .from("manufacturer_certified_tenants")
        .update({
          status: "active",
          notes: trimmedNotes,
          certified_at: new Date().toISOString(),
          certified_by: caller.userId,
          revoked_at: null,
          revoked_by: null,
        })
        .eq("id", existing.id)
        .eq("manufacturer_id", manufacturerId)
        .select("*")
        .single();
      if (error) return apiInternalError(error, "manufacturer certifications POST reactivate");
      return apiJson({ certification: data });
    }

    const { data, error } = await admin
      .from("manufacturer_certified_tenants")
      .insert({
        manufacturer_id: manufacturerId,
        tenant_id,
        status: "active",
        notes: trimmedNotes,
        certified_by: caller.userId,
      })
      .select("*")
      .single();
    if (error) return apiInternalError(error, "manufacturer certifications POST insert");

    return apiJson({ certification: data });
  } catch (e) {
    return apiInternalError(e, "manufacturer certifications POST");
  }
}

/**
 * PATCH /api/manufacturer/certifications
 *
 * Revoke an active certification. admin role only. The row must
 * belong to the caller's manufacturer — the `manufacturer_id` filter
 * on the UPDATE prevents a malicious admin from revoking another
 * manufacturer's certification even if they guess the row id.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("認定操作は admin ロールのみ実行できます。");

  const parsed = revokeSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "入力に誤りがあります。");
  }
  const { id, notes } = parsed.data;
  const trimmedNotes = (notes ?? "").trim() || null;

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer certifications revoke — admin caller scoped to own manufacturer_id",
    );
    const manufacturerId = caller.manufacturerId;

    const updates: Record<string, unknown> = {
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: caller.userId,
    };
    if (trimmedNotes) updates.notes = trimmedNotes;

    const { data, error } = await admin
      .from("manufacturer_certified_tenants")
      .update(updates)
      .eq("id", id)
      .eq("manufacturer_id", manufacturerId) // belt-and-suspenders cross-mfr guard
      .eq("status", "active")
      .select("*")
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        return apiNotFound("有効な認定が見つかりません（既に解除済みか、別メーカーの認定の可能性があります）。");
      }
      return apiInternalError(error, "manufacturer certifications PATCH");
    }
    return apiJson({ certification: data });
  } catch (e) {
    return apiInternalError(e, "manufacturer certifications PATCH");
  }
}
