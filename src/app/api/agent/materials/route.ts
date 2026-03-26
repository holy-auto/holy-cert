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

    // Fetch categories
    const { data: categories } = await supabase
      .from("agent_material_categories")
      .select("id, name, slug, description")
      .order("sort_order", { ascending: true });

    // Fetch published materials with category name
    const { data: materials } = await supabase
      .from("agent_materials")
      .select(`
        id, category_id, title, description, file_name, file_size, file_type,
        version, is_pinned, download_count, created_at, updated_at,
        agent_material_categories ( name )
      `)
      .eq("is_published", true)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    const enriched = (materials ?? []).map((m: any) => ({
      ...m,
      category_name: m.agent_material_categories?.name ?? "",
      agent_material_categories: undefined,
    }));

    return NextResponse.json({
      categories: categories ?? [],
      materials: enriched,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 }
    );
  }
}
