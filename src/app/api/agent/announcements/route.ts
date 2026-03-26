import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── GET: Fetch published agent announcements with read status ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    // Fetch published announcements (RLS ensures only published_at <= now())
    const { data: announcements, error } = await supabase
      .from("agent_announcements")
      .select("id, title, body, category, is_pinned, published_at, created_at")
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString())
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[agent/announcements] db error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // Fetch read status for current user
    const { data: reads } = await supabase
      .from("agent_announcement_reads")
      .select("announcement_id")
      .eq("user_id", ctx.userId);

    const readIds = new Set(
      (reads ?? []).map((r: { announcement_id: string }) => r.announcement_id)
    );

    const result = (announcements ?? []).map((a) => ({
      ...a,
      is_read: readIds.has(a.id),
    }));

    const unreadCount = result.filter((a) => !a.is_read).length;

    return NextResponse.json({
      announcements: result,
      unread_count: unreadCount,
    });
  } catch (e: unknown) {
    console.error("[agent/announcements] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
