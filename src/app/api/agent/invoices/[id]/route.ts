import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, routeCtx: RouteContext) {
  const limited = await checkRateLimit(_request, "general");
  if (limited) return limited;

  try {
    const { id } = await routeCtx.params;
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const [invoiceRes, linesRes, agentRes] = await Promise.all([
      supabase
        .from("agent_invoices")
        .select("*")
        .eq("id", id)
        .eq("agent_id", ctx.agentId)
        .single(),
      supabase
        .from("agent_invoice_lines")
        .select("*")
        .eq("invoice_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("agents")
        .select("name, contact_name, contact_email, address")
        .eq("id", ctx.agentId)
        .single(),
    ]);

    if (!invoiceRes.data) {
      return NextResponse.json({ error: "invoice_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      invoice: invoiceRes.data,
      lines: linesRes.data ?? [],
      agent: agentRes.data,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
