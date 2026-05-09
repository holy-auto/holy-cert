import { z } from "zod";

export const SERVICE_PACKAGE_CATEGORIES = [
  "coating",
  "ppf",
  "detailing",
  "maintenance",
  "body_repair",
  "general",
] as const;

export type ServicePackageCategory = (typeof SERVICE_PACKAGE_CATEGORIES)[number];

export const SERVICE_PACKAGE_CATEGORY_LABEL: Record<ServicePackageCategory, string> = {
  coating: "コーティング",
  ppf: "PPF",
  detailing: "ディテーリング",
  maintenance: "整備",
  body_repair: "鈑金塗装",
  general: "その他",
};

export const PRICE_STRATEGIES = ["sum_of_items", "fixed", "manual"] as const;
export type PriceStrategy = (typeof PRICE_STRATEGIES)[number];

const itemInputSchema = z.object({
  menu_item_id: z.string().uuid("メニュー品目IDが不正です。"),
  quantity: z.coerce.number().positive("数量は0より大きい値にしてください。").default(1),
  override_unit_price: z
    .union([z.coerce.number().int().min(0), z.null()])
    .optional()
    .transform((v) => (v == null ? null : v)),
  sort_order: z.coerce.number().int().min(0).default(0),
});

const packageBaseSchema = z.object({
  name: z.string().trim().min(1, "パッケージ名は必須です。").max(100),
  description: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional()
    .transform((v) => v || null),
  category: z.enum(SERVICE_PACKAGE_CATEGORIES).default("general"),
  price_strategy: z.enum(PRICE_STRATEGIES).default("sum_of_items"),
  fixed_price: z
    .union([z.coerce.number().int().min(0), z.null()])
    .optional()
    .transform((v) => (v == null ? null : v)),
  recommended_template_id: z
    .union([z.string().uuid(), z.null()])
    .optional()
    .transform((v) => v || null),
  sort_order: z.coerce.number().int().min(0).default(0),
});

export const servicePackageCreateSchema = packageBaseSchema
  .extend({
    items: z.array(itemInputSchema).default([]),
  })
  .refine((v) => v.price_strategy !== "fixed" || (v.fixed_price != null && v.fixed_price >= 0), {
    message: "price_strategy='fixed' のときは fixed_price が必要です。",
    path: ["fixed_price"],
  });

export const servicePackageUpdateSchema = packageBaseSchema
  .partial()
  .extend({
    items: z.array(itemInputSchema).optional(),
    is_archived: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.price_strategy === undefined || v.price_strategy !== "fixed" || (v.fixed_price != null && v.fixed_price >= 0),
    { message: "price_strategy='fixed' のときは fixed_price が必要です。", path: ["fixed_price"] },
  );

export type ServicePackageCreateInput = z.infer<typeof servicePackageCreateSchema>;
export type ServicePackageUpdateInput = z.infer<typeof servicePackageUpdateSchema>;
export type ServicePackageItemInput = z.infer<typeof itemInputSchema>;
