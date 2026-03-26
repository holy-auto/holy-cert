import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const { data: links } = await supabase
      .from("agent_referral_links")
      .select("*")
      .eq("agent_id", ctx.agentId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ links: links ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const label = ((body.label as string) ?? "").trim();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cartrust.jp";
    const code = `AL-${ctx.agentId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const url = `${baseUrl}/ref/${code}`;

    const { data: link, error } = await supabase
      .from("agent_referral_links")
      .insert({
        agent_id: ctx.agentId,
        code,
        label: label || null,
        url,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
