import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { apiUnauthorized, apiInternalError } from "@/lib/api/response";

/**
 * PUT /api/admin/notifications/[id]/read
 * 通知を既読にする
 */
export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    // RLS をバイパスしてサービスロールで UPDATE（tenant_id で必ずスコープ限定）
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .is("read_at", null);

    if (error) return apiInternalError(error, "mark notification read");

    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiInternalError(e, "mark notification read");
  }
}
