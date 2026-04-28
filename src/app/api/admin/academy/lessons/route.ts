/**
 * GET /api/admin/academy/lessons   一覧
 * POST /api/admin/academy/lessons  新規作成
 *
 * 閲覧範囲:
 * - tab="published": 公開済み全件 (Free は level='intro' のみ)
 * - tab="drafts":    自テナントの下書き (admin+ 推奨、RLSで強制)
 * - tab="mine":      自分が作者
 */
import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { apiOk, apiUnauthorized, apiInternalError, apiValidationError, apiForbidden } from "@/lib/api/response";
import { canUseFeature } from "@/lib/billing/planFeatures";
import { hasMinRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

const VALID_LEVELS = ["intro", "basic", "standard", "pro"] as const;

const createSchema = z.object({
  title: z.string().trim().min(3, "タイトルを3文字以上で入力してください").max(200),
  summary: z.string().trim().max(500).optional(),
  body: z.string().trim().min(10, "本文を10文字以上で入力してください").max(50000),
  category: z.string().trim().min(1).max(50),
  level: z.enum(VALID_LEVELS).default("basic"),
  difficulty: z.number().int().min(1).max(5).default(3),
  video_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  cover_image_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  publish_as_platform: z.boolean().default(false), // super_admin のみ tenant_id=null で投稿可
});

/** GET 一覧 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") ?? "published") as "published" | "drafts" | "mine";
    const category = searchParams.get("category");
    const level = searchParams.get("level");

    let query = supabase
      .from("academy_lessons")
      .select(
        "id, tenant_id, author_user_id, category, level, difficulty, title, summary, video_url, cover_image_url, tags, status, published_at, view_count, rating_avg, rating_count, created_at",
      );

    if (tab === "drafts") {
      query = query.eq("tenant_id", caller.tenantId).eq("status", "draft");
    } else if (tab === "mine") {
      query = query.eq("author_user_id", caller.userId);
    } else {
      query = query.eq("status", "published");
      // Free プランは入門のみ
      if (!canUseFeature(caller.planTier, "academy_know_how")) {
        query = query.eq("level", "intro");
      }
    }

    if (category) query = query.eq("category", category);
    if (level && (VALID_LEVELS as readonly string[]).includes(level)) query = query.eq("level", level);

    const { data, error } = await query.order("rating_avg", { ascending: false }).limit(100);
    if (error) return apiInternalError(error);

    const intro_only = tab === "published" && !canUseFeature(caller.planTier, "academy_know_how");

    return apiOk({ lessons: data ?? [], intro_only });
  } catch (e: unknown) {
    return apiInternalError(e);
  }
}

/** POST 作成 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    // 投稿は admin 以上 (staff/viewer は不可)
    if (!hasMinRole(caller.role, "admin")) {
      return apiForbidden("レッスン投稿は管理者権限が必要です");
    }

    const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiValidationError(parsed.error.issues[0]?.message ?? "invalid payload");
    }
    const v = parsed.data;

    // tenant_id=null (運営コンテンツ) として投稿できるのは super_admin のみ
    const isPlatformPost = v.publish_as_platform === true;
    if (isPlatformPost && caller.role !== "super_admin") {
      return apiForbidden("運営コンテンツとしての投稿はプラットフォーム管理者のみ可能です");
    }

    const insert = {
      tenant_id: isPlatformPost ? null : caller.tenantId,
      author_user_id: caller.userId,
      title: v.title,
      summary: v.summary || null,
      body: v.body,
      category: v.category,
      level: v.level,
      difficulty: v.difficulty,
      video_url: v.video_url || null,
      cover_image_url: v.cover_image_url || null,
      tags: v.tags,
      status: v.status,
      published_at: v.status === "published" ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase.from("academy_lessons").insert(insert).select("id").single();
    if (error) return apiInternalError(error);

    return apiOk({ id: data?.id }, 201);
  } catch (e: unknown) {
    return apiInternalError(e);
  }
}
