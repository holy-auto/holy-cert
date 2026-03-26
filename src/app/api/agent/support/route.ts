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

    const { data: tickets } = await supabase
      .from("agent_support_tickets")
      .select("*")
      .eq("agent_id", ctx.agentId)
      .order("updated_at", { ascending: false });

    return NextResponse.json({ tickets: tickets ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const subject = ((body.subject as string) ?? "").trim();
    const category = body.category ?? "general";
    const priority = body.priority ?? "normal";
    const message = ((body.message as string) ?? "").trim();

    if (!subject || !message) {
      return NextResponse.json({ error: "subject and message are required" }, { status: 400 });
    }

    // Create ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("agent_support_tickets")
      .insert({
        agent_id: ctx.agentId,
        user_id: ctx.userId,
        subject,
        category,
        priority,
      })
      .select()
      .single();

    if (ticketErr) return NextResponse.json({ error: ticketErr.message }, { status: 500 });

    // Add initial message
    await supabase.from("agent_ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: ctx.userId,
      is_admin: false,
      body: message,
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
