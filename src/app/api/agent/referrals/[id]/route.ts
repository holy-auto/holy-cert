import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import type { ReferralStatus } from "@/types/agent";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

/** Allowed status transitions: current status → allowed next statuses */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["contacted", "cancelled"],
  contacted: ["in_negotiation", "cancelled"],
  in_negotiation: ["trial", "contracted", "cancelled"],
  trial: ["contracted", "cancelled"],
  contracted: ["churned"],
  cancelled: [], // terminal
  churned: [],   // terminal
};

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET: Fetch single referral by id ───
export async function GET(_request: NextRequest, context: RouteContext) {
  const limited = await checkRateLimit(_request, "general");
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const { data: referral, error } = await supabase
      .from("agent_referrals")
      .select("*")
      .eq("id", id)
      .eq("agent_id", ctx.agentId)
      .single();

    if (error || !referral) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ referral });
  } catch (e: unknown) {
    console.error("[agent/referrals/[id]] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── PUT: Update referral ───
export async function PUT(request: NextRequest, context: RouteContext) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    // Only admin or staff can update referrals
    if (ctx.role !== "admin" && ctx.role !== "staff") {
      return NextResponse.json(
        { error: "forbidden", message: "紹介を更新する権限がありません。" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Fetch current referral to validate status transition
    const { data: existing, error: fetchErr } = await supabase
      .from("agent_referrals")
      .select("*")
      .eq("id", id)
      .eq("agent_id", ctx.agentId)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const updates: Record<string, unknown> = {};

    // Optional field updates
    if (body.contact_name !== undefined) {
      updates.contact_name = ((body.contact_name as string) ?? "").trim() || null;
    }
    if (body.contact_email !== undefined) {
      updates.contact_email = ((body.contact_email as string) ?? "").trim() || null;
    }
    if (body.contact_phone !== undefined) {
      updates.contact_phone = ((body.contact_phone as string) ?? "").trim() || null;
    }
    if (body.notes !== undefined) {
      updates.notes = ((body.notes as string) ?? "").trim() || null;
    }

    // Status transition validation
    if (body.status !== undefined) {
      const newStatus = (body.status as string).trim() as ReferralStatus;
      const currentStatus = existing.status as string;
      const allowed = VALID_TRANSITIONS[currentStatus] ?? [];

      if (!allowed.includes(newStatus)) {
        return NextResponse.json(
          {
            error: "invalid_status_transition",
            message: `ステータスを「${currentStatus}」から「${newStatus}」に変更することはできません。`,
            allowed_transitions: allowed,
          },
          { status: 400 }
        );
      }

      updates.status = newStatus;

      // Automatically set contracted_at when transitioning to contracted
      if (newStatus === "contracted" && !existing.contracted_at) {
        updates.contracted_at = new Date().toISOString();
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
      .from("agent_referrals")
      .update(updates)
      .eq("id", id)
      .eq("agent_id", ctx.agentId)
      .select()
      .single();

    if (updateErr) {
      console.error("[agent/referrals/[id]] update error:", updateErr.message);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, referral: updated });
  } catch (e: unknown) {
    console.error("[agent/referrals/[id]] PUT error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
