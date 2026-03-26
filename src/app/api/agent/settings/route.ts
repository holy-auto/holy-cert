import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── GET: Agent profile settings and current user's role ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    // Fetch agent profile
    const { data: profile, error: profileErr } = await supabase
      .from("agents")
      .select("*")
      .eq("id", ctx.agentId)
      .single();

    if (profileErr || !profile) {
      console.error("[agent/settings] profile fetch error:", profileErr?.message);
      return NextResponse.json({ error: "agent_profile_not_found" }, { status: 404 });
    }

    // Fetch current user's role in this agent org
    const { data: membership, error: memberErr } = await supabase
      .from("agent_users")
      .select("role, display_name")
      .eq("agent_id", ctx.agentId)
      .eq("user_id", ctx.userId)
      .single();

    if (memberErr) {
      console.error("[agent/settings] membership fetch error:", memberErr.message);
    }

    return NextResponse.json({
      agent: profile,
      current_user: {
        user_id: ctx.userId,
        role: membership?.role ?? ctx.role ?? "viewer",
        display_name: membership?.display_name ?? null,
      },
    });
  } catch (e: unknown) {
    console.error("[agent/settings] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── PUT: Update agent profile settings ───
export async function PUT(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    // Only admin can update settings
    if (ctx.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "設定を更新する権限がありません。" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    // Build the update object from allowed fields
    const allowedFields = [
      "name",
      "contact_name",
      "contact_email",
      "contact_phone",
      "company_name",
      "company_address",
      "website_url",
      "logo_url",
      "commission_type",
      "commission_rate",
      "bank_name",
      "bank_branch",
      "bank_account_type",
      "bank_account_number",
      "bank_account_holder",
      "notes",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const value = body[field];
        // Trim string values, allow null
        if (typeof value === "string") {
          updates[field] = value.trim() || null;
        } else {
          updates[field] = value;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "no_updates", message: "更新するフィールドがありません。" },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from("agents")
      .update(updates)
      .eq("id", ctx.agentId)
      .select()
      .single();

    if (updateErr) {
      console.error("[agent/settings] update error:", updateErr.message);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, agent: updated });
  } catch (e: unknown) {
    console.error("[agent/settings] PUT error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
