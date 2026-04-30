import { NextRequest } from "next/server";
import { resolveMobileCaller } from "@/lib/auth/mobileAuth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  apiOk,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiInternalError,
} from "@/lib/api/response";

export const dynamic = "force-dynamic";

// 廃棄/紛失ターゲット (DBの check constraint と整合)
const RETIRE_TARGETS = ["lost", "retired"] as const;
type RetireTarget = (typeof RETIRE_TARGETS)[number];

function isRetireTarget(v: unknown): v is RetireTarget {
  return typeof v === "string" && (RETIRE_TARGETS as readonly string[]).includes(v);
}

// ─── PATCH: NFCタグの状態を lost/retired に遷移 ───
//
// Path param `[id]` は **nfc_tags の uuid PK** (一覧画面から取得済みのため)
// /write, /attach は物理UID で検索するが、廃棄系は管理画面経由なので PK 直指定。
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "certificates:edit")) return apiForbidden();

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: unknown;
    };

    if (!isRetireTarget(body.status)) {
      return apiValidationError(`status は ${RETIRE_TARGETS.join(", ")} のいずれかを指定してください`);
    }

    const { data: tag } = await caller.supabase
      .from("nfc_tags")
      .select("id, status")
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .maybeSingle();

    if (!tag) return apiNotFound();

    // 既に同じ状態 → 冪等
    if (tag.status === body.status) {
      return apiOk({ nfc_tag: { id: tag.id, status: tag.status } });
    }

    // retired は終端状態。lost からの遷移は許可するが retired からは戻さない
    if (tag.status === "retired") {
      return apiValidationError("廃棄済みのタグは状態変更できません");
    }

    const { data, error } = await caller.supabase
      .from("nfc_tags")
      .update({ status: body.status })
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .select("id, status, tag_code, uid, certificate_id")
      .single();

    if (error) return apiInternalError(error, "nfc.status");

    await caller.supabase.from("audit_logs").insert({
      tenant_id: caller.tenantId,
      table_name: "nfc_tags",
      record_id: id,
      action: `nfc_tag_${body.status}`,
      performed_by: caller.userId,
      ip_address: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"),
    });

    return apiOk({ nfc_tag: data });
  } catch (e) {
    return apiInternalError(e, "nfc.status");
  }
}
