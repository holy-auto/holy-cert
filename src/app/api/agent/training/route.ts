import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { apiInternalError } from "@/lib/api/response";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    // Fetch courses
    const { data: courses } = await supabase
      .from("agent_training_courses")
      .select("*")
      .eq("is_published", true)
      .order("sort_order", { ascending: true });

    // Fetch user progress
    const { data: progress } = await supabase
      .from("agent_training_progress")
      .select("*")
      .eq("user_id", ctx.userId);

    const progressMap = new Map((progress ?? []).map((p) => [p.course_id, p]));

    const enriched = (courses ?? []).map((c: any) => ({
      ...c,
      progress: progressMap.get(c.id) ?? null,
    }));

    // Stats
    const totalCourses = enriched.length;
    const completedCourses = enriched.filter((c: any) => c.progress?.status === "completed").length;
    const requiredCourses = enriched.filter((c: any) => c.is_required).length;
    const requiredCompleted = enriched.filter((c: any) => c.is_required && c.progress?.status === "completed").length;

    return NextResponse.json({
      courses: enriched,
      stats: { total: totalCourses, completed: completedCourses, required: requiredCourses, required_completed: requiredCompleted },
    });
  } catch (e) {
    return apiInternalError(e, "agent training GET");
  }
}

// Update progress
export async function PUT(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const body = await request.json().catch(() => ({}));
    const courseId = body.course_id as string;
    const progressVal = Math.min(100, Math.max(0, body.progress ?? 0));
    const status = progressVal >= 100 ? "completed" : progressVal > 0 ? "in_progress" : "not_started";

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("agent_training_progress")
      .upsert(
        {
          course_id: courseId,
          user_id: ctx.userId,
          agent_id: ctx.agentId,
          status,
          progress: progressVal,
          started_at: progressVal > 0 ? now : null,
          completed_at: status === "completed" ? now : null,
        },
        { onConflict: "course_id,user_id" }
      )
      .select()
      .single();

    if (error) return apiInternalError(error, "agent training PUT");
    return NextResponse.json({ progress: data });
  } catch (e) {
    return apiInternalError(e, "agent training PUT");
  }
}
