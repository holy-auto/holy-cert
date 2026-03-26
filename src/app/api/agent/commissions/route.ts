import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── GET: List agent commissions with period filters and summary ───
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const url = new URL(request.url);
    const periodFrom = url.searchParams.get("period_from");
    const periodTo = url.searchParams.get("period_to");

    // Query commissions joined with referrals for shop_name
    let query = supabase
      .from("agent_commissions")
      .select("*, agent_referrals(shop_name)")
      .eq("agent_id", ctx.agentId)
      .order("period_start", { ascending: false });

    if (periodFrom) {
      query = query.gte("period_start", periodFrom);
    }
    if (periodTo) {
      query = query.lte("period_end", periodTo);
    }

    const { data: commissions, error } = await query;

    if (error) {
      console.error("[agent/commissions] db error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    const rows = (commissions ?? []).map((c: Record<string, unknown>) => {
      const ref = c.agent_referrals as Record<string, unknown> | null;
      return {
        ...c,
        shop_name: ref?.shop_name ?? null,
        agent_referrals: undefined,
      };
    });

    // Compute summary from all commissions for this agent (not filtered)
    const { data: allCommissions, error: summaryErr } = await supabase
      .from("agent_commissions")
      .select("amount, status, period_start")
      .eq("agent_id", ctx.agentId);

    if (summaryErr) {
      console.error("[agent/commissions] summary error:", summaryErr.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    let totalEarned = 0;
    let totalPending = 0;
    let thisMonth = 0;

    for (const c of allCommissions ?? []) {
      const amount = (c.amount as number) ?? 0;
      const status = c.status as string;
      const periodStart = c.period_start as string;

      if (status === "approved" || status === "paid") {
        totalEarned += amount;
      }
      if (status === "pending") {
        totalPending += amount;
      }
      if (
        (status === "pending" || status === "approved" || status === "paid") &&
        periodStart >= thisMonthStart
      ) {
        thisMonth += amount;
      }
    }

    return NextResponse.json({
      commissions: rows,
      summary: {
        total_earned: totalEarned,
        total_pending: totalPending,
        this_month: thisMonth,
      },
    });
  } catch (e: unknown) {
    console.error("[agent/commissions] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
