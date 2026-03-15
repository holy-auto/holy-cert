import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ caseId: string }> };

/** GET /api/insurance-cases/[caseId]/messages — メッセージ一覧 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { caseId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("insurance_case_messages")
    .select("id, sender_id, visibility, body, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ messages: data ?? [] });
}

/** POST /api/insurance-cases/[caseId]/messages — メッセージ送信 */
export async function POST(req: Request, ctx: RouteContext) {
  const { caseId } = await ctx.params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { body: messageBody, visibility: requestedVisibility } = body;

  if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  // 保険会社ユーザーは visibility を shared に強制（DB トリガーでも防御）
  const { data: insurerUser } = await supabase
    .from("insurer_users")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  const visibility = insurerUser
    ? "shared"
    : (requestedVisibility === "internal" ? "internal" : "shared");

  const { data: msg, error } = await supabase
    .from("insurance_case_messages")
    .insert({
      case_id: caseId,
      sender_id: auth.user.id,
      visibility,
      body: messageBody.trim(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // イベントログ
  await supabase.from("insurance_case_events").insert({
    case_id: caseId,
    actor_id: auth.user.id,
    event_type: "message_sent",
    detail: { message_id: msg.id, visibility },
  });

  return NextResponse.json(msg, { status: 201 });
}
