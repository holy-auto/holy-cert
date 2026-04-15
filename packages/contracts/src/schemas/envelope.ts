import { z } from "zod";

// Mirror of src/lib/api/response.ts shape.
// Keep these in sync — they are the wire format for every /api/mobile/* route.

export const apiErrorCodeSchema = z.enum([
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "rate_limit_unavailable",
  "billing_required",
  "plan_limit",
  "db_error",
  "auth_error",
  "internal_error",
]);
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;

export const apiErrorSchema = z.object({
  error: apiErrorCodeSchema,
  message: z.string(),
}).catchall(z.unknown());
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

/** Build a success envelope schema: `{ ok: true, ...data }`. */
export function apiOkSchema<T extends z.ZodRawShape>(data: T) {
  return z.object({ ok: z.literal(true), ...data });
}
