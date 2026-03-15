import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";

/**
 * GET /api/insurer/certificate?pid=PUBLIC_ID
 *
 * public_id ベースで証明書を取得する（保険会社閲覧用）。
 * 既存の /api/insurer/certificate/[id] (UUID指定) と併存する。
 */
export async function GET(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid") ?? "";

  if (!pid) {
    return NextResponse.json(
      { error: "Missing pid (public_id) query parameter" },
      { status: 400 },
    );
  }

  const sb = await createClient();
  const { data: auth } = await sb.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  // RPC経由で証明書を取得（SECURITY DEFINER でテナント RLS をバイパス）
  const { data, error } = await sb.rpc("insurer_get_certificate", {
    p_public_id: pid,
    p_ip: ip,
    p_user_agent: ua,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const cert = Array.isArray(data) ? data[0] : null;
  if (!cert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // RPC内部で監査ログ記録済みのため、ここでは不要

  return NextResponse.json({ certificate: cert });
}
