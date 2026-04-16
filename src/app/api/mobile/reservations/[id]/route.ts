import { NextRequest } from "next/server";
import { resolveMobileCaller } from "@/lib/auth/mobileAuth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  apiOk,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiValidationError,
  apiInternalError,
} from "@/lib/api/response";
import { updateReservationInputSchema } from "@ledra/contracts";

export const dynamic = "force-dynamic";

// ─── GET: Reservation detail ───
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "reservations:view")) return apiForbidden();

    const { id } = await params;

    const { data, error } = await caller.supabase
      .from("reservations")
      .select(
        `id, title, scheduled_date, start_time, end_time, status,
         payment_status, estimated_amount, customer_id, vehicle_id,
         menu_items_json, note, assigned_user_id, sub_status, progress_note,
         customers(name), vehicles(maker, model, plate_display)`,
      )
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .single();

    if (error || !data) return apiNotFound();

    return apiOk({ reservation: data });
  } catch (e) {
    return apiInternalError(e, "reservations.get");
  }
}

// ─── PUT: Update reservation ───
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const caller = await resolveMobileCaller(request);
    if (!caller) return apiUnauthorized();
    if (!hasPermission(caller.role, "reservations:edit")) return apiForbidden();

    const { id } = await params;
    const raw = await request.json().catch(() => null);
    if (!raw) return apiValidationError("Invalid request body");

    const result = updateReservationInputSchema.safeParse(raw);
    if (!result.success) {
      return apiValidationError(result.error.issues[0].message);
    }

    // Strip undefined keys so Supabase only updates provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result.data)) {
      if (value !== undefined) updates[key] = value;
    }

    const { data, error } = await caller.supabase
      .from("reservations")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .select()
      .single();

    if (error || !data) return apiNotFound();

    return apiOk({ reservation: data });
  } catch (e) {
    return apiInternalError(e, "reservations.update");
  }
}
