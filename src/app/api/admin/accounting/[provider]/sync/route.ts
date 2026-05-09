/**
 * POST /api/admin/accounting/{provider}/sync
 * 加盟店の手動同期トリガー。UI の「今すぐ同期」ボタンから呼ばれる。
 */

import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiForbidden, apiNotFound, apiInternalError, apiError } from "@/lib/api/response";
import { isAccountingProvider } from "@/lib/accounting/registry";
import { syncTenantToProvider, reasonLabel } from "@/lib/accounting/sync";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    if (!isAccountingProvider(provider)) return apiNotFound("Unknown accounting provider");

    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!requireMinRole(caller, "admin")) return apiForbidden();

    // 加盟店の連打防止 (admin_write preset = 60 req / 60 s per IP)
    const limited = await checkRateLimit(req, "admin_write");
    if (limited) return limited;

    const result = await syncTenantToProvider({
      tenantId: caller.tenantId,
      provider,
      triggerType: "manual",
      triggeredBy: caller.userId,
    });

    if (result.reason) {
      return apiError({
        code: "validation_error",
        message: reasonLabel(result.reason),
        status: 400,
        data: { reason: result.reason },
      });
    }

    return apiOk({
      attempted: result.attempted,
      synced: result.synced,
      failed: result.failed,
      skipped: result.skipped,
      errors: result.errors.slice(0, 10),
    });
  } catch (e) {
    return apiInternalError(e, "accounting manual sync");
  }
}
