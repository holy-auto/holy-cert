import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { InsuranceCaseStatus } from "@/types/insurer";

export const runtime = "nodejs";

// ステータス遷移ルール
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "cancelled"],
  under_review: ["info_requested", "approved", "rejected"],
  info_requested: ["under_review"],
  approved: ["closed"],
  rejected: ["closed"],
};

type RouteContext = { params: Promise<{ caseId: string }> };

/** GET /api/insurance-cases/[caseId] — 案件詳細 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { caseId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("insurance_cases")
    .select("*, tenants!inner(name), vehicles!inner(maker, model, plate_display)")
    .eq("id", caseId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // 参加者一覧
  const { data: participants } = await supabase
    .from("insurance_case_participants")
    .select("id, user_id, role, is_active")
    .eq("case_id", caseId);

  // メッセージ一覧（RLS で visibility 制御）
  const { data: messages } = await supabase
    .from("insurance_case_messages")
    .select("id, sender_id, visibility, body, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  // 送信者名を参加者テーブルから解決
  const participantMap = new Map(
    (participants ?? []).map((p: any) => [p.user_id, p])
  );

  const enrichedMessages = (messages ?? []).map((m: any) => {
    const p = participantMap.get(m.sender_id);
    return {
      ...m,
      sender_name: p?.display_name ?? m.sender_id?.slice(0, 8) ?? "不明",
      sender_role: p?.role ?? "unknown",
    };
  });

  return NextResponse.json({
    id: data.id,
    case_number: data.case_number,
    title: data.title,
    case_type: data.case_type,
    status: data.status,
    description: data.description,
    damage_summary: data.damage_summary,
    admitted_at: data.admitted_at,
    tenant_name: data.tenants?.name ?? "",
    vehicle_summary: [data.vehicles?.maker, data.vehicles?.model, data.vehicles?.plate_display]
      .filter(Boolean)
      .join(" "),
    submitted_at: data.submitted_at,
    updated_at: data.updated_at,
    last_message_at: enrichedMessages.length > 0
      ? enrichedMessages[enrichedMessages.length - 1].created_at
      : null,
    messages: enrichedMessages,
    participants: (participants ?? []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      role: p.role,
      display_name: null,
      is_active: p.is_active,
    })),
  });
}

/** PATCH /api/insurance-cases/[caseId] — ステータス変更 */
export async function PATCH(req: Request, ctx: RouteContext) {
  const { caseId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const newStatus = body.status as InsuranceCaseStatus;
  if (!newStatus) return NextResponse.json({ error: "missing_status" }, { status: 400 });

  // 現在のステータス取得
  const { data: current, error: fetchErr } = await supabase
    .from("insurance_cases")
    .select("id, status")
    .eq("id", caseId)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });
  if (!current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // 遷移ルール検証
  const allowed = VALID_TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: "invalid_transition", from: current.status, to: newStatus, allowed },
      { status: 422 }
    );
  }

  // 更新
  const updates: Record<string, any> = { status: newStatus };
  if (newStatus === "submitted") updates.submitted_at = new Date().toISOString();
  if (["approved", "rejected", "closed"].includes(newStatus)) updates.resolved_at = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from("insurance_cases")
    .update(updates)
    .eq("id", caseId)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

  // イベントログ
  await supabase.from("insurance_case_events").insert({
    case_id: caseId,
    actor_id: auth.user.id,
    event_type: "status_changed",
    detail: { from: current.status, to: newStatus },
  });

  return NextResponse.json(updated);
}
