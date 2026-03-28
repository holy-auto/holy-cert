import { z } from "zod";

export const piiDisclosureConsentSchema = z.object({
  certificate_id: z.string().uuid("証明書IDの形式が不正です。"),
  insurer_id: z.string().uuid("保険会社IDの形式が不正です。"),
});
