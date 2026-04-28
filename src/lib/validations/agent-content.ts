import { z } from "zod";

/**
 * Schemas for agent-portal content management routes
 * (announcements / faq / training / materials).
 *
 * 共通方針:
 * - title / body / question 等の文字列は trim 必須・1〜上限文字数
 * - id / 関連 ID は uuid 必須
 * - PUT では全フィールド optional (部分更新)
 */

const NON_EMPTY = (max: number, label: string) =>
  z.string().trim().min(1, `${label}は必須です。`).max(max, `${label}は${max}文字以内で入力してください。`);

export const agentAnnouncementCreateSchema = z.object({
  title: NON_EMPTY(200, "タイトル"),
  body: NON_EMPTY(10_000, "本文"),
  category: z.string().trim().max(100).optional().default("general"),
  is_pinned: z.boolean().optional().default(false),
  published_at: z.string().datetime("公開日時の形式が不正です。").optional(),
});
export type AgentAnnouncementCreate = z.infer<typeof agentAnnouncementCreateSchema>;

export const agentAnnouncementUpdateSchema = z
  .object({
    title: NON_EMPTY(200, "タイトル").optional(),
    body: NON_EMPTY(10_000, "本文").optional(),
    category: z.string().trim().max(100).optional(),
    is_pinned: z.boolean().optional(),
    published_at: z.string().datetime("公開日時の形式が不正です。").optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentAnnouncementUpdate = z.infer<typeof agentAnnouncementUpdateSchema>;

export const agentFaqCreateSchema = z.object({
  category_id: z.string().uuid("カテゴリ ID の形式が不正です。"),
  question: NON_EMPTY(500, "質問"),
  answer: NON_EMPTY(10_000, "回答"),
  sort_order: z.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});
export type AgentFaqCreate = z.infer<typeof agentFaqCreateSchema>;

export const agentFaqUpdateSchema = z
  .object({
    category_id: z.string().uuid("カテゴリ ID の形式が不正です。").optional(),
    question: NON_EMPTY(500, "質問").optional(),
    answer: NON_EMPTY(10_000, "回答").optional(),
    sort_order: z.number().int().min(0).optional(),
    is_published: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentFaqUpdate = z.infer<typeof agentFaqUpdateSchema>;

export const agentTrainingCreateSchema = z.object({
  title: NON_EMPTY(200, "タイトル"),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(100).optional(),
  content_type: z.enum(["video", "document", "quiz", "external"]).optional(),
  content_url: z.string().trim().url("コンテンツ URL の形式が不正です。").max(2000).optional(),
  thumbnail_url: z.string().trim().url("サムネイル URL の形式が不正です。").max(2000).optional(),
  duration_min: z
    .number()
    .int()
    .min(0)
    .max(60 * 24)
    .optional(),
  is_required: z.boolean().optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
});
export type AgentTrainingCreate = z.infer<typeof agentTrainingCreateSchema>;

export const agentTrainingUpdateSchema = z
  .object({
    title: NON_EMPTY(200, "タイトル").optional(),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(100).optional(),
    content_type: z.enum(["video", "document", "quiz", "external"]).optional(),
    content_url: z.string().trim().url("コンテンツ URL の形式が不正です。").max(2000).optional(),
    thumbnail_url: z.string().trim().url("サムネイル URL の形式が不正です。").max(2000).optional(),
    duration_min: z
      .number()
      .int()
      .min(0)
      .max(60 * 24)
      .optional(),
    is_required: z.boolean().optional(),
    is_published: z.boolean().optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentTrainingUpdate = z.infer<typeof agentTrainingUpdateSchema>;

export const agentMaterialUpdateSchema = z
  .object({
    title: NON_EMPTY(200, "タイトル").optional(),
    description: z.string().trim().max(5000).optional(),
    category_id: z.string().uuid("カテゴリ ID の形式が不正です。").optional(),
    version: z.string().trim().max(64).optional(),
    is_pinned: z.boolean().optional(),
    is_published: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentMaterialUpdate = z.infer<typeof agentMaterialUpdateSchema>;
