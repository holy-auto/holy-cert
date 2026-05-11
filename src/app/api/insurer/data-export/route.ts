/**
 * GET /api/insurer/data-export
 *
 * GDPR / 個人情報保護法対応: 認証済み保険会社 (insurer admin) が、自社の
 * 保有データを JSON でエクスポートする。
 *
 * スコープ:
 *   - insurer 本体 (会社情報・連絡先・plan_tier)
 *   - insurer_users (内部ユーザの id+role。auth.users 本体は対象外)
 *   - insurer_cases (案件)
 *   - insurer_tenant_contracts (契約済み加盟店)
 *   - insurer_access_logs (監査ログ)
 *
 * 権限: insurer の admin ロールのみ (viewer / auditor では取得不可)。
 *       監査ログまで含むため admin に絞る。
 *
 * 出力: application/json (Content-Disposition: attachment).
 * Rate limit: 3/h per (insurer, user).
 */

import { NextRequest } from "next/server";
import { createInsurerScopedAdmin } from "@/lib/supabase/admin";
import { resolveInsurerCaller } from "@/lib/api/insurerAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { apiUnauthorized, apiForbidden, apiJson, apiInternalError } from "@/lib/api/response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface ExportSection {
  table: string;
  count: number;
  rows: Array<Record<string, unknown>>;
}

async function fetchByInsurer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  insurerId: string,
  table: string,
  columns = "*",
  limit = 10_000,
): Promise<ExportSection> {
  const { data, error } = await admin.from(table).select(columns).eq("insurer_id", insurerId).limit(limit);
  if (error) {
    logger.warn("insurer/data-export: section query failed", {
      table,
      insurerId,
      error: error.message,
    });
    return { table, count: 0, rows: [] };
  }
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return { table, count: rows.length, rows };
}

export async function GET(req: NextRequest) {
  try {
    const caller = await resolveInsurerCaller();
    if (!caller) return apiUnauthorized();
    if (caller.role !== "admin") {
      return apiForbidden("保険会社の管理者ロールのみ実行可能です。");
    }

    const rlKey = `insurer-data-export:${caller.insurerId}:${caller.userId || getClientIp(req)}`;
    const rl = await checkRateLimit(rlKey, { limit: 3, windowSec: 3600 });
    if (!rl.allowed) {
      return apiJson(
        { error: "rate_limited", message: "エクスポート回数の上限に達しました。1時間後に再度お試しください。" },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const { admin, insurerId } = createInsurerScopedAdmin(caller.insurerId);

    // The insurer row itself.
    const { data: insurerRow } = await admin
      .from("insurers")
      .select("id, name, slug, contact_email, contact_phone, plan_tier, status, created_at, updated_at")
      .eq("id", insurerId)
      .maybeSingle();

    const [users, cases, contracts, accessLogs] = await Promise.all([
      fetchByInsurer(admin, insurerId, "insurer_users", "id, insurer_id, user_id, role, is_active, created_at"),
      fetchByInsurer(admin, insurerId, "insurer_cases"),
      fetchByInsurer(admin, insurerId, "insurer_tenant_contracts"),
      fetchByInsurer(admin, insurerId, "insurer_access_logs", "*", 50_000),
    ]);

    const generatedAt = new Date().toISOString();
    const filename = `ledra-insurer-export-${insurerId.slice(0, 8)}-${generatedAt.slice(0, 10)}.json`;

    const payload = {
      schema_version: "1.0",
      generated_at: generatedAt,
      insurer: insurerRow,
      exported_by: { user_id: caller.userId, insurer_user_id: caller.insurerUserId, role: caller.role },
      sections: {
        insurer_users: users,
        insurer_cases: cases,
        insurer_tenant_contracts: contracts,
        insurer_access_logs: accessLogs,
      },
      metadata: {
        notice:
          "本データは個人情報保護法第33条 / GDPR 第15条に基づき、認証済み保険会社管理者に" +
          "紐づくすべての記録を含みます。他保険会社・他テナントのデータは含まれていません。",
        excluded:
          "auth.users 本体 (Supabase 直接管理) / 加盟店 (tenants) の内部詳細 / " + "他社の audit log は対象外です。",
      },
    };

    logger.info("insurer data export issued", {
      insurerId,
      userId: caller.userId,
      counts: {
        users: users.count,
        cases: cases.count,
        contracts: contracts.count,
        accessLogs: accessLogs.count,
      },
    });

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store, max-age=0",
        "x-robots-tag": "noindex, nofollow, noarchive",
      },
    });
  } catch (e: unknown) {
    return apiInternalError(e, "insurer/data-export");
  }
}
