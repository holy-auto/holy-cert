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

    const { data: invoices } = await supabase
      .from("agent_invoices")
      .select("*")
      .eq("agent_id", ctx.agentId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ invoices: invoices ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
