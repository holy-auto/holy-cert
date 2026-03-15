import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET /api/insurance-cases — 案件一覧（RLS で施工店/保険会社を自動制御） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const caseType = url.searchParams.get("case_type") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let query = supabase
    .from("insurance_cases")
    .select("*, tenants!inner(name), vehicles!inner(maker, model, plate_display)")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);
  if (caseType) query = query.eq("case_type", caseType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    case_number: r.case_number,
    title: r.title,
    case_type: r.case_type,
    status: r.status,
    tenant_name: r.tenants?.name ?? "",
    vehicle_summary: [r.vehicles?.maker, r.vehicles?.model, r.vehicles?.plate_display]
      .filter(Boolean)
      .join(" "),
    submitted_at: r.submitted_at,
    updated_at: r.updated_at,
    last_message_at: null,
  }));

  return NextResponse.json({ rows });
}

/** POST /api/insurance-cases — 案件作成（施工店のみ） */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { tenant_id, vehicle_id, insurer_id, case_type, title, description, damage_summary, admitted_at } = body;

  if (!tenant_id || !vehicle_id || !insurer_id || !case_type || !title) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  // 案件作成
  const { data: caseData, error: caseErr } = await supabase
    .from("insurance_cases")
    .insert({
      tenant_id,
      vehicle_id,
      insurer_id,
      case_type,
      title,
      description: description ?? null,
      damage_summary: damage_summary ?? null,
      admitted_at: admitted_at ?? null,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (caseErr) return NextResponse.json({ error: caseErr.message }, { status: 400 });

  // 起票者を参加者として登録
  await supabase.from("insurance_case_participants").insert({
    case_id: caseData.id,
    user_id: auth.user.id,
    role: "shop_owner",
    added_by: auth.user.id,
  });

  // イベントログ
  await supabase.from("insurance_case_events").insert({
    case_id: caseData.id,
    actor_id: auth.user.id,
    event_type: "created",
    detail: { case_type, title },
  });

  return NextResponse.json(caseData, { status: 201 });
}
