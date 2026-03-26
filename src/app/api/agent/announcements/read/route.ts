import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── POST: Mark an agent announcement as read ───
export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const announcementId = ((body?.announcement_id as string) ?? "").trim();

    if (!announcementId) {
      return NextResponse.json(
        { error: "announcement_id_required", message: "announcement_id は必須です。" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("agent_announcement_reads")
      .upsert(
        { announcement_id: announcementId, user_id: ctx.userId },
        { onConflict: "announcement_id,user_id" }
      );

    if (error) {
      console.error("[agent/announcements/read] upsert error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[agent/announcements/read] POST error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
