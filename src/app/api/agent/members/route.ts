import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

// ─── GET: List agent members ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    // Fetch all agent_users for this agent
    const { data: members, error } = await supabase
      .from("agent_users")
      .select("id, user_id, agent_id, role, display_name, created_at")
      .eq("agent_id", ctx.agentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[agent/members] db error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // Enrich with email from auth.users via admin client
    const admin = createAdminClient();
    const enriched = await Promise.all(
      (members ?? []).map(async (m) => {
        let email: string | null = null;
        if (m.user_id) {
          const { data } = await admin.auth.admin.getUserById(m.user_id);
          email = data?.user?.email ?? null;
        }
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role ?? "viewer",
          display_name: m.display_name ?? null,
          email,
          created_at: m.created_at,
          is_self: m.user_id === ctx.userId,
        };
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (e: unknown) {
    console.error("[agent/members] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── POST: Invite / add a member to the agent organization ───
export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    // Only admin can invite members
    if (ctx.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "メンバーを招待する権限がありません。" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const email = ((body?.email as string) ?? "").trim().toLowerCase();
    const role = ((body?.role as string) ?? "").trim() || "viewer";
    const displayName = ((body?.display_name as string) ?? "").trim() || null;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "invalid_email", message: "有効なメールアドレスを入力してください。" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "staff", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "invalid_role", message: "無効なロールです。admin, staff, viewer のいずれかを指定してください。" },
        { status: 400 }
      );
    }

    // Upsert the agent user via RPC
    const { data: member, error: upsertErr } = await supabase.rpc("upsert_agent_user", {
      p_agent_id: ctx.agentId,
      p_email: email,
      p_role: role,
      p_display_name: displayName,
    });

    if (upsertErr) {
      console.error("[agent/members] upsert error:", upsertErr.message);
      return NextResponse.json(
        { error: "upsert_failed", message: upsertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, member }, { status: 201 });
  } catch (e: unknown) {
    console.error("[agent/members] POST error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
