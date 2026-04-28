import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { apiOk, apiUnauthorized, apiForbidden, apiInternalError } from "@/lib/api/response";
import { parsePagination } from "@/lib/api/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return apiUnauthorized();

    const { data: agentData } = await supabase.rpc("get_my_agent_status");
    const agent = Array.isArray(agentData) ? agentData[0] : agentData;
    if (!agent?.agent_id) return apiForbidden("代理店情報が見つかりません。");

    const url = new URL(request.url);
    const period = url.searchParams.get("period") ?? "month";
    const p = parsePagination(request, { defaultPerPage: 50, maxPerPage: 200 });

    const { data: rankings } = await supabase.rpc("agent_rankings", { p_period: period });

    // Anonymize: replace names with "代理店A", "代理店B", etc. except own.
    // Rank index is computed against the full list before pagination so
    // pagination doesn't shift the displayed rank number.
    const allItems = (rankings ?? []).map((r: any, i: number) => ({
      rank: i + 1,
      agent_name: r.agent_id === agent.agent_id ? r.agent_name : `代理店${String.fromCharCode(65 + (i % 26))}`,
      is_self: r.agent_id === agent.agent_id,
      referral_count: r.referral_count,
      contracted_count: r.contracted_count,
      conversion_rate: r.conversion_rate,
      total_commission: r.agent_id === agent.agent_id ? r.total_commission : null,
    }));

    // Find own rank from the full list (so the "self_rank" is correct
    // regardless of which page the caller requested).
    const selfRank = allItems.find((r: { is_self: boolean }) => r.is_self);

    const total = allItems.length;
    const items = p.page > 0 ? allItems.slice(p.from, p.to + 1) : allItems.slice(0, p.perPage);

    return apiOk({
      rankings: items,
      self_rank: selfRank ?? null,
      page: p.page,
      per_page: p.perPage,
      total,
    });
  } catch (e) {
    // apiInternalError sanitizes in production (was leaking e.message directly before)
    return apiInternalError(e, "agent/rankings GET");
  }
}
