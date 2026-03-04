import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  try {
    const pid = req.nextUrl.searchParams.get("pid") ?? req.nextUrl.searchParams.get("public_id");
    if (!pid) return NextResponse.json({ error: "Missing pid" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // certificates.public_id から tenant_id を取得
    const c = await supabase
      .from("certificates")
      .select("tenant_id, status")
      .eq("public_id", pid)
      .limit(1)
      .maybeSingle();

    if (c.error) return NextResponse.json({ error: "Failed to read certificate", detail: c.error.message }, { status: 500 });
    if (!c.data?.tenant_id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const t = await supabase
      .from("tenants")
      .select("name, slug, is_active")
      .eq("id", c.data.tenant_id)
      .limit(1)
      .maybeSingle();

    if (t.error) return NextResponse.json({ error: "Failed to read tenant", detail: t.error.message }, { status: 500 });

    return NextResponse.json(
      {
        billing_active: !!t.data?.is_active,
        tenant_name: t.data?.name ?? t.data?.slug ?? null,
        certificate_status: c.data.status ?? null,
      },
      { status: 200, headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    console.error("public-status failed", e);
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
