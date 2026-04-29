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

/** ─── Agent Campaigns ─────────────────────────────────────── */

const CAMPAIGN_TYPES = ["commission_boost", "referral_bonus", "tier_promotion"] as const;
const TARGET_AGENTS = ["all", "tier_basic", "tier_silver", "tier_gold", "selected"] as const;

export const agentCampaignCreateSchema = z.object({
  title: NON_EMPTY(200, "タイトル"),
  description: z.string().trim().max(5000).optional(),
  campaign_type: z.enum(CAMPAIGN_TYPES).optional(),
  bonus_rate: z.number().min(0).max(100).optional(),
  bonus_fixed: z.number().int().min(0).optional(),
  start_date: z.string().min(1, "開始日は必須です。"),
  end_date: z.string().min(1, "終了日は必須です。"),
  banner_text: z.string().trim().max(500).optional(),
  target_agents: z.enum(TARGET_AGENTS).optional(),
});
export type AgentCampaignCreate = z.infer<typeof agentCampaignCreateSchema>;

export const agentCampaignUpdateSchema = z
  .object({
    title: NON_EMPTY(200, "タイトル").optional(),
    description: z.string().trim().max(5000).optional(),
    campaign_type: z.enum(CAMPAIGN_TYPES).optional(),
    bonus_rate: z.number().min(0).max(100).optional(),
    bonus_fixed: z.number().int().min(0).optional(),
    start_date: z.string().min(1).optional(),
    end_date: z.string().min(1).optional(),
    is_active: z.boolean().optional(),
    banner_text: z.string().trim().max(500).optional(),
    target_agents: z.enum(TARGET_AGENTS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentCampaignUpdate = z.infer<typeof agentCampaignUpdateSchema>;

/** ─── Agent Contracts (signing requests) ─────────────────── */

const CONTRACT_TEMPLATE_TYPES = ["referral", "outsourcing", "nda", "other"] as const;

export const agentContractCreateSchema = z.object({
  agent_id: z.string().uuid("代理店 ID の形式が不正です。"),
  template_type: z.enum(CONTRACT_TEMPLATE_TYPES),
  title: NON_EMPTY(200, "タイトル"),
  signer_email: z.string().trim().email("メールアドレスの形式が不正です。").max(254),
  signer_name: NON_EMPTY(100, "署名者名"),
});
export type AgentContractCreate = z.infer<typeof agentContractCreateSchema>;

export const agentContractActionSchema = z.object({
  action: z.enum(["resend", "cancel"], { message: "action は resend / cancel のみです。" }),
});
export type AgentContractAction = z.infer<typeof agentContractActionSchema>;

/** ─── Agent Invoices ─────────────────────────────────────── */

export const AGENT_INVOICE_STATUSES = ["draft", "issued", "paid", "void"] as const;

const invoiceLineSchema = z.object({
  description: NON_EMPTY(200, "明細"),
  quantity: z.number().int().min(0).optional(),
  unit_price: z.number().int().min(0).optional(),
  amount: z.number().int().min(0).optional(),
});

export const agentInvoiceCreateSchema = z.object({
  agent_id: z.string().uuid("代理店 ID の形式が不正です。"),
  period_start: z.string().min(1, "対象期間の開始日は必須です。"),
  period_end: z.string().min(1, "対象期間の終了日は必須です。"),
  subtotal: z.number().int().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  status: z.enum(AGENT_INVOICE_STATUSES).optional(),
  notes: z.string().trim().max(5000).optional(),
  lines: z.array(invoiceLineSchema).optional(),
});
export type AgentInvoiceCreate = z.infer<typeof agentInvoiceCreateSchema>;

export const agentInvoiceUpdateSchema = z
  .object({
    status: z.enum(AGENT_INVOICE_STATUSES).optional(),
    issued_at: z.string().optional(),
    paid_at: z.string().optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AgentInvoiceUpdate = z.infer<typeof agentInvoiceUpdateSchema>;

/** ─── Agent Notifications (admin push) ───────────────────── */

const AGENT_NOTIFICATION_TYPES = ["info", "warning", "success", "error"] as const;

export const agentNotificationCreateSchema = z.object({
  agent_id: z.string().uuid("代理店 ID の形式が不正です。"),
  type: z.enum(AGENT_NOTIFICATION_TYPES).optional(),
  title: NON_EMPTY(200, "タイトル"),
  body: NON_EMPTY(5000, "本文"),
  link: z.string().trim().url("リンク URL の形式が不正です。").max(2000).optional(),
});
export type AgentNotificationCreate = z.infer<typeof agentNotificationCreateSchema>;

/** ─── Admin Agents (代理店マスタ CRUD) ──────────────────── */

const COMMISSION_TYPES = ["rate", "fixed"] as const;
const AGENT_STATUSES = ["active", "inactive", "pending"] as const;

export const adminAgentCreateSchema = z.object({
  name: NON_EMPTY(200, "名称"),
  contact_name: z.string().trim().max(100).optional(),
  contact_email: z.string().trim().email("メールアドレスの形式が不正です。").max(254).optional(),
  contact_phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
});
export type AdminAgentCreate = z.infer<typeof adminAgentCreateSchema>;

export const adminAgentUpdateSchema = z
  .object({
    name: NON_EMPTY(200, "名称").optional(),
    contact_name: z.string().trim().max(100).optional(),
    contact_email: z.string().trim().email("メールアドレスの形式が不正です。").max(254).optional(),
    contact_phone: z.string().trim().max(50).optional(),
    address: z.string().trim().max(500).optional(),
    status: z.enum(AGENT_STATUSES).optional(),
    commission_type: z.enum(COMMISSION_TYPES).optional(),
    default_commission_rate: z.number().min(0).max(100).optional(),
    default_commission_fixed: z.number().int().min(0).optional(),
    line_official_id: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "更新するフィールドを 1 つ以上指定してください。",
  });
export type AdminAgentUpdate = z.infer<typeof adminAgentUpdateSchema>;

/** ─── Admin NFC ──────────────────────────────────────────── */

const NFC_ACTIONS = ["attach", "detach", "retire"] as const;

export const adminNfcActionSchema = z.object({
  id: z.string().uuid("NFC タグ ID の形式が不正です。"),
  action: z.enum(NFC_ACTIONS).optional(),
  certificate_id: z.string().uuid("証明書 ID の形式が不正です。").optional(),
  vehicle_id: z.string().uuid("車両 ID の形式が不正です。").optional(),
});
export type AdminNfcAction = z.infer<typeof adminNfcActionSchema>;
