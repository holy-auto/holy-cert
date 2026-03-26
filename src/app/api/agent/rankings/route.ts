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
    const period = url.searchParams.get("period") ?? "month";

    const { data: rankings } = await supabase.rpc("agent_rankings", { p_period: period });

    // Anonymize: replace names with "代理店A", "代理店B", etc. except own
    const items = (rankings ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      agent_name: r.agent_id === ctx.agentId ? r.agent_name : `代理店${String.fromCharCode(65 + (i % 26))}`,
      is_self: r.agent_id === ctx.agentId,
      referral_count: r.referral_count,
      contracted_count: r.contracted_count,
      conversion_rate: r.conversion_rate,
      total_commission: r.agent_id === ctx.agentId ? r.total_commission : null,
    }));

    // Find own rank
    const selfRank = items.find((r: any) => r.is_self);

    return NextResponse.json({ rankings: items, self_rank: selfRank ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
