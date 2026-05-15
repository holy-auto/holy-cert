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

const ROLE_VALUES = ["admin", "viewer"] as const;

const inviteSchema = z.object({
  email: z.string().trim().email("メールアドレス形式が不正です。").max(254),
  display_name: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.enum(ROLE_VALUES).optional(),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  is_active: z.boolean().optional(),
  role: z.enum(ROLE_VALUES).optional(),
  display_name: z.string().trim().max(120).nullable().optional(),
});

/**
 * GET /api/manufacturer/members
 *
 * List the calling manufacturer's portal members with email. admin
 * only — viewers don't manage the team. manufacturer_id is always
 * taken from the session, never the request.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("メンバー管理は admin ロールのみ実行できます。");

  try {
    const admin = createServiceRoleAdmin(
      "manufacturer members list — caller-scoped read of own manufacturer's members",
    );
    const manufacturerId = caller.manufacturerId;

    const { data: members, error } = await admin
      .from("manufacturer_memberships")
      .select("id, user_id, role, display_name, is_active, created_at, updated_at")
      .eq("manufacturer_id", manufacturerId)
      .order("created_at", { ascending: false });
    if (error) return apiInternalError(error, "manufacturer members GET");

    const userIds = (members ?? []).map((m) => m.user_id as string);
    const emailByUserId = new Map<string, string | null>();
    if (userIds.length > 0) {
      let page = 1;
      while (page <= 20) {
        const { data: pageData } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (!pageData?.users?.length) break;
        for (const u of pageData.users) {
          if (userIds.includes(u.id)) emailByUserId.set(u.id, u.email ?? null);
        }
        if (pageData.users.length < 200) break;
        page++;
      }
    }

    const enriched = (members ?? []).map((m) => ({
      ...m,
      email: emailByUserId.get(m.user_id as string) ?? null,
      is_self: m.user_id === caller.userId,
    }));
    return apiJson({ members: enriched });
  } catch (e) {
    return apiInternalError(e, "manufacturer members GET");
  }
}

/**
 * POST /api/manufacturer/members
 *
 * Manufacturer-side self-service invite. admin only. Mirrors the
 * platform-admin invite flow but the manufacturer_id is fixed to the
 * caller's own — a manufacturer admin can never invite into another
 * manufacturer. Sends a Supabase invite email; if the email already
 * exists, just creates/reactivates the membership row.
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("メンバー管理は admin ロールのみ実行できます。");

  const parsed = inviteSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "入力に誤りがあります。");
  }
  const { email, display_name, role } = parsed.data;
  const trimmedDisplayName = (display_name ?? "").trim() || null;

  try {
    const admin = createServiceRoleAdmin("manufacturer members invite — caller-scoped to own manufacturer_id");
    const manufacturerId = caller.manufacturerId;

    const userMeta: Record<string, unknown> = { manufacturer_id: manufacturerId };
    if (trimmedDisplayName) userMeta.display_name = trimmedDisplayName;

    const redirectTo =
      (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ledra.co.jp").replace(/\/$/, "") + "/manufacturer";
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: userMeta,
      redirectTo,
    });

    let userId: string;
    if (invited?.user) {
      userId = invited.user.id;
    } else if (inviteErr?.message?.toLowerCase().includes("already")) {
      let found: { id: string } | null = null;
      let page = 1;
      while (!found && page <= 20) {
        const { data: pageData } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (!pageData?.users?.length) break;
        const match = pageData.users.find((u) => u.email === email);
        if (match) {
          found = { id: match.id };
          break;
        }
        if (pageData.users.length < 200) break;
        page++;
      }
      if (!found) {
        return apiInternalError(
          inviteErr ?? new Error("既存ユーザーが見つかりませんでした。"),
          "manufacturer members POST lookup",
        );
      }
      userId = found.id;
    } else {
      return apiInternalError(inviteErr ?? new Error("招待に失敗しました。"), "manufacturer members POST invite");
    }

    const { data: existing } = await admin
      .from("manufacturer_memberships")
      .select("id, is_active")
      .eq("manufacturer_id", manufacturerId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return apiValidationError("このユーザーは既にメンバーです。");
      }
      const { data, error } = await admin
        .from("manufacturer_memberships")
        .update({
          is_active: true,
          role: role ?? "viewer",
          display_name: trimmedDisplayName,
          invited_by: caller.userId,
        })
        .eq("id", existing.id)
        .eq("manufacturer_id", manufacturerId)
        .select("*")
        .single();
      if (error) return apiInternalError(error, "manufacturer members POST reactivate");
      return apiJson({ membership: data });
    }

    const { data, error } = await admin
      .from("manufacturer_memberships")
      .insert({
        manufacturer_id: manufacturerId,
        user_id: userId,
        role: role ?? "viewer",
        display_name: trimmedDisplayName,
        invited_by: caller.userId,
        is_active: true,
      })
      .select("*")
      .single();
    if (error) return apiInternalError(error, "manufacturer members POST insert");

    return apiJson({ membership: data });
  } catch (e) {
    return apiInternalError(e, "manufacturer members POST");
  }
}

/**
 * PATCH /api/manufacturer/members
 *
 * Toggle is_active / change role / update display name. admin only,
 * scoped to the caller's manufacturer. A manufacturer admin cannot
 * deactivate or demote their own membership (prevents self-lockout
 * leaving the manufacturer with no admin).
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const caller = await resolveManufacturerCaller(supabase);
  if (!caller) return apiUnauthorized();
  if (caller.role !== "admin") return apiForbidden("メンバー管理は admin ロールのみ実行できます。");

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return apiValidationError(parsed.error.issues[0]?.message ?? "入力に誤りがあります。");
  }
  const { id, ...rest } = parsed.data;
  if (Object.keys(rest).length === 0) {
    return apiValidationError("更新項目がありません。");
  }

  try {
    const admin = createServiceRoleAdmin("manufacturer members update — caller-scoped to own manufacturer_id");
    const manufacturerId = caller.manufacturerId;

    // Resolve the target row first so we can (a) confirm it belongs to
    // this manufacturer and (b) block self-lockout.
    const { data: target } = await admin
      .from("manufacturer_memberships")
      .select("id, user_id, manufacturer_id")
      .eq("id", id)
      .eq("manufacturer_id", manufacturerId)
      .maybeSingle();
    if (!target) return apiNotFound("メンバーが見つかりません。");

    if (target.user_id === caller.userId) {
      if (rest.is_active === false || rest.role === "viewer") {
        return apiValidationError("自分自身の無効化・権限降格はできません（管理者不在を防ぐため）。");
      }
    }

    const { data, error } = await admin
      .from("manufacturer_memberships")
      .update({ ...rest })
      .eq("id", id)
      .eq("manufacturer_id", manufacturerId)
      .select("*")
      .single();
    if (error) {
      if (error.code === "PGRST116") return apiNotFound("メンバーが見つかりません。");
      return apiInternalError(error, "manufacturer members PATCH");
    }
    return apiJson({ membership: data });
  } catch (e) {
    return apiInternalError(e, "manufacturer members PATCH");
  }
}
