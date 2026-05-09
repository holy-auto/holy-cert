import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import { CERTIFICATE_MEDIA_BUCKET } from "@/lib/certificateMedia";
import { apiOk, apiInternalError, apiUnauthorized, apiNotFound } from "@/lib/api/response";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await checkRateLimit(req, "general");
    if (limited) return limited;

    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const { id } = await params;
    if (!id) return apiNotFound("メディアが見つかりません。");

    const { admin } = createTenantScopedAdmin(caller.tenantId);

    const { data: row } = await admin
      .from("certificate_media")
      .select("id, storage_path, before_path, poster_path, tenant_id")
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .maybeSingle<{
        id: string;
        storage_path: string;
        before_path: string | null;
        poster_path: string | null;
        tenant_id: string;
      }>();

    if (!row) return apiNotFound("メディアが見つかりません。");

    const paths = [row.storage_path, row.before_path, row.poster_path].filter(
      (p): p is string => typeof p === "string" && p.length > 0,
    );

    // Storage 削除は best-effort: DB 行の削除を canonical とする。
    if (paths.length > 0) {
      const { error: storageErr } = await admin.storage.from(CERTIFICATE_MEDIA_BUCKET).remove(paths);
      if (storageErr) {
        console.error("[media delete] storage remove error", storageErr);
      }
    }

    const { error: dbErr } = await admin
      .from("certificate_media")
      .delete()
      .eq("id", id)
      .eq("tenant_id", caller.tenantId);

    if (dbErr) return apiInternalError(dbErr, "media delete");

    return apiOk({ deleted: true });
  } catch (e) {
    return apiInternalError(e, "media delete");
  }
}
