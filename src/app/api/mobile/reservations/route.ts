import { NextRequest } from "next/server";
import { resolveMobileCaller } from "@/lib/auth/mobileAuth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  apiOk,
  apiUnauthorized,
  apiForbidden,
  apiValidationError,
  apiInternalError,
} from "@/lib/api/response";
import {
  listReservationsQuerySchema,
  createReservationInputSchema,
} from "@ledra/contracts";

export const dynamic = "force-dynamic";

// ─── GET: List reservations for tenant ───
export async function GET(request: NextRequest) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "reservations:view")) return apiForbidden();

    const url = request.nextUrl;
    const qResult = listReservationsQuerySchema.safeParse({
      store_id: url.searchParams.get("store_id") ?? undefined,
      date: url.searchParams.get("date") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!qResult.success) {
      return apiValidationError(qResult.error.issues[0].message);
    }
    const q = qResult.data;

    let query = caller.supabase
      .from("reservations")
      .select(
        `id, title, scheduled_date, start_time, end_time, status,
         payment_status, estimated_amount, customer_id, vehicle_id,
         menu_items_json, note, assigned_user_id, sub_status, progress_note,
         customers(name), vehicles(maker, model, plate_display)`,
      )
      .eq("tenant_id", caller.tenantId)
      .order("scheduled_date", { ascending: true });

    if (q.store_id) query = query.eq("store_id", q.store_id);
    if (q.date) query = query.eq("scheduled_date", q.date);
    if (q.status) query = query.eq("status", q.status);

    const { data, error } = await query;
    if (error) return apiInternalError(error, "reservations.list");

    return apiOk({ reservations: data ?? [] });
  } catch (e) {
    return apiInternalError(e, "reservations.list");
  }
}

// ─── POST: Create reservation ───
export async function POST(request: NextRequest) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "reservations:create")) return apiForbidden();

    const raw = await request.json().catch(() => null);
    if (!raw) return apiValidationError("Invalid request body");

    const result = createReservationInputSchema.safeParse(raw);
    if (!result.success) {
      return apiValidationError(result.error.issues[0].message);
    }
    const body = result.data;

    const storeId =
      body.store_id ??
      request.nextUrl.searchParams.get("store_id") ??
      undefined;

    const { data, error } = await caller.supabase
      .from("reservations")
      .insert({
        tenant_id: caller.tenantId,
        scheduled_date: body.scheduled_date,
        customer_id: body.customer_id,
        vehicle_id: body.vehicle_id ?? null,
        title: body.title ?? null,
        menu_items_json: body.menu_items_json ?? null,
        start_time: body.start_time ?? null,
        end_time: body.end_time ?? null,
        note: body.note ?? null,
        assigned_user_id: body.assigned_user_id ?? null,
        store_id: storeId ?? null,
        estimated_amount: body.estimated_amount ?? null,
        status: "confirmed",
        created_by: caller.userId,
      })
      .select()
      .single();

    if (error) return apiInternalError(error, "reservations.create");

    return apiOk({ reservation: data }, 201);
  } catch (e) {
    return apiInternalError(e, "reservations.create");
  }
}
