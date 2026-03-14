import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getClientMeta(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
  const ua = req.headers.get("user-agent") ?? null;
  return { ip, ua };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const dateFrom = url.searchParams.get("date_from") ?? "";
  const dateTo = url.searchParams.get("date_to") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);
  const offset = Math.max(parseInt(url.searchParams.get("offset") ?? "0", 10) || 0, 0);

  const { ip, ua } = getClientMeta(req);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rpcParams: Record<string, unknown> = {
    p_query: q,
    p_limit: limit,
    p_offset: offset,
    p_ip: ip,
    p_user_agent: ua,
  };

  if (status) rpcParams.p_status = status;
  if (dateFrom) rpcParams.p_date_from = new Date(dateFrom).toISOString();
  if (dateTo) {
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);
    rpcParams.p_date_to = to.toISOString();
  }

  const { data, error } = await supabase.rpc("insurer_search_certificates", rpcParams);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ rows: data ?? [] });
}
