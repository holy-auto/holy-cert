import { NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Check if any operator exists — if none, first user becomes super_admin
  const { count } = await admin
    .from("operator_users")
    .select("id", { count: "exact", head: true });

  const role = (count ?? 0) === 0 ? "super_admin" : "operator";

  // Check if already registered
  const { data: existing } = await admin
    .from("operator_users")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "既に登録されています" }, { status: 409 });
  }

  const { error } = await admin
    .from("operator_users")
    .insert({
      user_id: user.id,
      display_name: user.email ?? "",
      role,
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role }, { status: 201 });
}
