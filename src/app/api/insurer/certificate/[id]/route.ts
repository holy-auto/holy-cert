import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // insurer_user であることを検証
  const { data: insurerUser } = await sb
    .from("insurer_users")
    .select("id, insurer_id")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!insurerUser) {
    return NextResponse.json({ error: "Not an insurer user" }, { status: 403 });
  }

  // admin client で証明書を取得（RLS バイパス）
  const admin = createAdminClient();
  const { data: cert, error } = await admin
    .from("certificates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 監査ログ記録
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  try {
    await admin.from("insurer_access_logs").insert({
      insurer_id: insurerUser.insurer_id,
      insurer_user_id: insurerUser.id,
      certificate_id: id,
      action: "view",
      meta: { route: "GET /api/insurer/certificate/[id]" },
      ip,
      user_agent: ua,
    });
  } catch {
    // 監査ログ失敗は閲覧をブロックしない
  }

  return NextResponse.json({ certificate: cert });
}
