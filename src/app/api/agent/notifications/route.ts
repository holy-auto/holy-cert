import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const url = new URL(request.url);
    const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10));

    const { data: notifications } = await supabase
      .from("agent_notifications")
      .select("*")
      .eq("agent_id", ctx.agentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

    return NextResponse.json({ notifications: notifications ?? [], unread_count: unreadCount });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

// Mark notifications as read
export async function PUT(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const ids = body.ids as string[] | undefined;

    let query = supabase
      .from("agent_notifications")
      .update({ is_read: true })
      .eq("agent_id", ctx.agentId);

    if (ids && ids.length > 0) {
      query = query.in("id", ids);
    }

    await query;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
