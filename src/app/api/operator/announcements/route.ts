import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

async function verifyOperator(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const admin = createSupabaseAdminClient();
  const { data } = await admin.from("operator_users").select("user_id").eq("user_id", user.id).single();
  return !!data;
}

export async function POST(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const title = String(body.title ?? "").trim();
  const bodyText = String(body.body ?? "").trim();
  const category = String(body.category ?? "info").trim();
  const published = body.published !== false;

  if (!title || !bodyText) return NextResponse.json({ error: "title and body required" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("announcements")
    .insert({
      title,
      body: bodyText,
      category,
      published,
      published_at: published ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ announcement: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (body.published !== undefined) {
    update.published = body.published;
    if (body.published) update.published_at = new Date().toISOString();
  }
  if (body.title) update.title = body.title;
  if (body.body) update.body = body.body;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("announcements").update(update).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyOperator())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("announcements").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
