import { z } from "zod";
import { apiOkSchema } from "./envelope";

// Reservation: the row shape returned by /api/mobile/reservations.
// Source of truth: supabase.reservations table + the select() projection in
// src/app/api/mobile/reservations/route.ts.

export const reservationStatusSchema = z.enum([
  "confirmed",
  "in_progress",
  "completed",
  "canceled",
]);
export type ReservationStatus = z.infer<typeof reservationStatusSchema>;

export const paymentStatusSchema = z.enum([
  "unpaid",
  "paid",
  "partial",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const reservationRowSchema = z.object({
  id: z.string(),
  title: nullableString,
  scheduled_date: z.string(), // YYYY-MM-DD
  start_time: nullableString, // HH:MM:SS
  end_time: nullableString,
  status: reservationStatusSchema,
  payment_status: paymentStatusSchema.nullable(),
  estimated_amount: nullableNumber,
  customer_id: z.string().nullable(),
  vehicle_id: z.string().nullable(),
  menu_items_json: z.unknown().nullable(),
  note: nullableString,
  assigned_user_id: z.string().nullable(),
  sub_status: nullableString,
  progress_note: nullableString,
  customers: z
    .object({ name: nullableString })
    .nullable()
    .optional(),
  vehicles: z
    .object({
      maker: nullableString,
      model: nullableString,
      plate_display: nullableString,
    })
    .nullable()
    .optional(),
});
export type ReservationRow = z.infer<typeof reservationRowSchema>;

// GET /api/mobile/reservations
export const listReservationsQuerySchema = z.object({
  store_id: z.string().optional(),
  date: z.string().optional(),
  status: reservationStatusSchema.optional(),
});
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

export const listReservationsResponseSchema = apiOkSchema({
  reservations: z.array(reservationRowSchema),
});
export type ListReservationsResponse = z.infer<
  typeof listReservationsResponseSchema
>;

// POST /api/mobile/reservations
export const createReservationInputSchema = z.object({
  scheduled_date: z.string(),
  customer_id: z.string(),
  vehicle_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  menu_items_json: z.unknown().nullable().optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  assigned_user_id: z.string().nullable().optional(),
  store_id: z.string().nullable().optional(),
  estimated_amount: z.number().nullable().optional(),
});
export type CreateReservationInput = z.infer<
  typeof createReservationInputSchema
>;

export const createReservationResponseSchema = apiOkSchema({
  reservation: reservationRowSchema,
});
export type CreateReservationResponse = z.infer<
  typeof createReservationResponseSchema
>;
