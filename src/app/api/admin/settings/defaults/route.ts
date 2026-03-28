import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { apiForbidden, apiValidationError } from "@/lib/api/response";

const defaultsUpdateSchema = z.object({
  default_warranty_exclusions: z.string().default(""),
});

export const dynamic = "force-dynamic";

/** GET: テナントのデフォルト保証除外内容を取得 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("tenants")
      .select("default_warranty_exclusions")
      .eq("id", caller.tenantId)
      .single();

    if (error) {
      console.error("[admin/settings/defaults] GET db_error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({
      default_warranty_exclusions: data?.default_warranty_exclusions ?? "",
    });
  } catch (e: any) {
    console.error("admin settings defaults GET failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/** PUT: テナントのデフォルト保証除外内容を更新 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "admin")) return apiForbidden();

    const body = await req.json().catch(() => ({}));
    const parsed = defaultsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues.map((i) => i.message).join(", "));
    }

    const { error } = await supabase
      .from("tenants")
      .update({ default_warranty_exclusions: parsed.data.default_warranty_exclusions })
      .eq("id", caller.tenantId);

    if (error) {
      console.error("[admin/settings/defaults] PUT db_error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin settings defaults PUT failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
