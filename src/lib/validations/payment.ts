import { z } from "zod";

const paymentMethods = ["cash", "card", "qr", "bank_transfer", "other"] as const;
const paymentStatuses = ["completed", "pending", "refunded", "partial_refund", "voided", "cancelled"] as const;

export const paymentCreateSchema = z.object({
  payment_method: z.enum(paymentMethods, { message: "無効な支払方法です。" }),
  amount: z.number().int().min(1, "金額は1円以上です。").max(999_999_999),
  received_amount: z.number().int().min(0).nullable().optional(),
  store_id: z.string().uuid().nullable().optional().transform(v => v || null),
  document_id: z.string().uuid().nullable().optional().transform(v => v || null),
  reservation_id: z.string().uuid().nullable().optional().transform(v => v || null),
  customer_id: z.string().uuid().nullable().optional().transform(v => v || null),
  register_session_id: z.string().uuid().nullable().optional().transform(v => v || null),
  note: z.string().trim().max(500).nullable().optional().transform(v => v || null),
  paid_at: z.string().nullable().optional(),
});

export const paymentUpdateSchema = z.object({
  id: z.string().uuid("無効なIDです。"),
  payment_method: z.enum(paymentMethods).optional(),
  amount: z.number().int().min(1).max(999_999_999).optional(),
  received_amount: z.number().int().min(0).nullable().optional(),
  change_amount: z.number().int().min(0).nullable().optional(),
  store_id: z.string().uuid().nullable().optional().transform(v => v || null),
  document_id: z.string().uuid().nullable().optional().transform(v => v || null),
  reservation_id: z.string().uuid().nullable().optional().transform(v => v || null),
  customer_id: z.string().uuid().nullable().optional().transform(v => v || null),
  status: z.enum(paymentStatuses).optional(),
  refund_amount: z.number().int().min(0).optional(),
  refund_reason: z.string().trim().max(500).nullable().optional().transform(v => v || null),
  note: z.string().trim().max(500).nullable().optional().transform(v => v || null),
  paid_at: z.string().nullable().optional(),
});

export const paymentDeleteSchema = z.object({
  id: z.string().uuid("無効なIDです。"),
});
