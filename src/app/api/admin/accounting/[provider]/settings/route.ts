/**
 * PATCH /api/admin/accounting/{provider}/settings
 * 加盟店が初期セットアップ後に「自動同期 ON/OFF」「デフォルト勘定科目変更」等を行う API。
 *
 * 加盟店のデフォルト体験では UI から触る必要が無いように作るが、
 * 後から細かい調整 (取引先の振り分けなど) ができる退避口として用意する。
 */

import { NextRequest } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { createTenantScopedAdmin } from "@/lib/supabase/admin";
import {
  apiOk,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiInternalError,
  apiValidationError,
} from "@/lib/api/response";
import { isAccountingProvider } from "@/lib/accounting/registry";
import { z } from "zod";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  auto_sync_enabled: z.boolean().optional(),
  default_sales_account_id: z.string().min(1).max(64).optional(),
  default_sales_account_name: z.string().min(1).max(128).optional(),
  default_tax_code: z.string().min(1).max(32).optional(),
  default_tax_rate: z.union([z.literal(0), z.literal(8), z.literal(10)]).optional(),
  default_partner_id: z.string().min(1).max(64).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await params;
    if (!isAccountingProvider(provider)) return apiNotFound("Unknown accounting provider");

    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();
    if (!requireMinRole(caller, "admin")) return apiForbidden();

    const json = await req.json().catch(() => null);
    const parsed = SettingsSchema.safeParse(json);
    if (!parsed.success) {
      return apiValidationError("入力値が不正です。", { issues: parsed.error.flatten() });
    }

    const { admin, tenantId } = createTenantScopedAdmin(caller.tenantId);
    const { error } = await admin
      .from("accounting_integrations")
      .update(parsed.data)
      .eq("tenant_id", tenantId)
      .eq("provider", provider);

    if (error) return apiInternalError(error, "accounting settings PATCH");
    return apiOk({ updated: true });
  } catch (e) {
    return apiInternalError(e, "accounting settings PATCH");
  }
}
