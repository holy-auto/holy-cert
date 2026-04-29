import { NextRequest } from "next/server";
import { resolveMobileCaller } from "@/lib/auth/mobileAuth";
import { hasPermission } from "@/lib/auth/permissions";
import { apiOk, apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api/response";
import { parseJsonBody } from "@/lib/api/parseBody";
import { mobileRegisterOpenSchema } from "@/lib/validations/mobile";

export const dynamic = "force-dynamic";

// ─── POST: Open register session ───
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "register_sessions:operate")) return apiForbidden();

    const { id } = await params;

    const parsed = await parseJsonBody(request, mobileRegisterOpenSchema);
    if (!parsed.ok) return parsed.response;
    const { opening_cash } = parsed.data;

    const { data, error } = await caller.supabase
      .from("register_sessions")
      .insert({
        tenant_id: caller.tenantId,
        register_id: id,
        status: "open",
        opening_cash,
        opened_by: caller.userId,
        opened_at: new Date().toISOString(),
      })
      .select("id, register_id, status, opening_cash, opened_by, opened_at")
      .single();

    if (error) return apiInternalError(error, "registers.open");

    return apiOk({ register_session: data }, 201);
  } catch (e) {
    return apiInternalError(e, "registers.open");
  }
}
