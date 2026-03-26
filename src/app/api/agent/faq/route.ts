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

    const [catRes, faqRes] = await Promise.all([
      supabase
        .from("agent_faq_categories")
        .select("*")
        .order("sort_order", { ascending: true }),
      supabase
        .from("agent_faqs")
        .select("*, agent_faq_categories(name)")
        .eq("is_published", true)
        .order("sort_order", { ascending: true }),
    ]);

    const faqs = (faqRes.data ?? []).map((f: any) => ({
      ...f,
      category_name: f.agent_faq_categories?.name ?? "",
      agent_faq_categories: undefined,
    }));

    return NextResponse.json({ categories: catRes.data ?? [], faqs });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "internal_error" }, { status: 500 });
  }
}
