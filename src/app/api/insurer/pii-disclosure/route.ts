import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveInsurerCaller } from "@/lib/api/insurerAuth";
import { apiUnauthorized, apiValidationError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { piiDisclosureConsentSchema } from "@/lib/validations/pii-disclosure";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  const caller = await resolveInsurerCaller();
  if (!caller) return apiUnauthorized();

  const certificateId = req.nextUrl.searchParams.get("certificate_id");
  if (!certificateId) return apiValidationError("Missing certificate_id");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pii_disclosure_consents")
    .select("id, certificate_id, insurer_id, insurer_requested_at, insurer_requested_by, insurer_reason, tenant_consented_at, tenant_consented_by, is_active, created_at, updated_at")
    .eq("certificate_id", certificateId)
    .eq("insurer_id", caller.insurerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return apiValidationError("操作に失敗しました。");

  const disclosed =
    data &&
    data.insurer_requested_at !== null &&
    data.tenant_consented_at !== null;

  return NextResponse.json({
    consent: data,
    disclosed,
    insurer_requested: !!data?.insurer_requested_at,
    tenant_consented: !!data?.tenant_consented_at,
  });
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  const caller = await resolveInsurerCaller();
  if (!caller) return apiUnauthorized();

  const body = await req.json().catch(() => ({}));

  const parsed = piiDisclosureConsentSchema
    .pick({ certificate_id: true })
    .extend({ reason: z.string().optional() })
    .safeParse(body);
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。");
  }

  const { certificate_id, reason } = parsed.data;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("pii_disclosure_consents")
    .upsert(
      {
        certificate_id,
        insurer_id: caller.insurerId,
        insurer_requested_at: new Date().toISOString(),
        insurer_requested_by: caller.userId,
        insurer_reason: reason || null,
        is_active: true,
      },
      { onConflict: "certificate_id,insurer_id" },
    )
    .select()
    .single();

  if (error) return apiValidationError("操作に失敗しました。");

  await admin.from("insurer_access_logs").insert({
    insurer_id: caller.insurerId,
    insurer_user_id: caller.insurerUserId,
    certificate_id,
    action: "pii_disclosure_request",
    meta: { reason: reason || null },
    ip:
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: req.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ consent: data });
}
