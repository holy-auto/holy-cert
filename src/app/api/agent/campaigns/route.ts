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
    const today = new Date().toISOString().slice(0, 10);

    const { data: campaigns } = await supabase
      .from("agent_campaigns")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("end_date", { ascending: true });

    // Also get upcoming campaigns
    const { data: upcoming } = await supabase
      .from("agent_campaigns")
      .select("*")
      .eq("is_active", true)
      .gt("start_date", today)
      .order("start_date", { ascending: true })
      .limit(5);

    // Past campaigns
    const { data: past } = await supabase
      .from("agent_campaigns")
      .select("*")
      .lt("end_date", today)
      .order("end_date", { ascending: false })
      .limit(10);

    return NextResponse.json({
      active: campaigns ?? [],
      upcoming: upcoming ?? [],
      past: past ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
