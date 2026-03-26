import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/rateLimit";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";

export const dynamic = "force-dynamic";

// ─── GET: Agent dashboard stats ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    // Fetch dashboard stats via RPC
    const { data: stats, error: statsErr } = await supabase.rpc("agent_dashboard_stats", {
      p_agent_id: ctx.agentId,
    });

    if (statsErr) {
      console.error("[agent/dashboard] rpc error:", statsErr.message);
      return NextResponse.json({ error: "failed_to_fetch_stats" }, { status: 500 });
    }

    return NextResponse.json({
      agent_id: ctx.agentId,
      agent_name: ctx.agentName,
      status: ctx.status,
      role: ctx.role,
      stats: stats ?? {},
    });
  } catch (e: unknown) {
    console.error("[agent/dashboard] error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
