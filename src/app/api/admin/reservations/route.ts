import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";
import { apiForbidden, apiValidationError } from "@/lib/api/response";
import { reservationCreateSchema, reservationUpdateSchema, reservationDeleteSchema } from "@/lib/validations/reservation";
import { syncCreateEvent, syncUpdateEvent, syncDeleteEvent } from "@/lib/gcal/client";
import { enforceBilling } from "@/lib/billing/guard";

export const dynamic = "force-dynamic";

// ─── GET: 予約一覧 ───
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "";
    const from = url.searchParams.get("from") ?? "";
    const to = url.searchParams.get("to") ?? "";
    const customerId = url.searchParams.get("customer_id") ?? "";

    let query = supabase
      .from("reservations")
      .select("id, customer_id, vehicle_id, title, menu_items_json, note, scheduled_date, start_time, end_time, assigned_user_id, status, estimated_amount, created_at")
      .eq("tenant_id", caller.tenantId)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (from) {
      query = query.gte("scheduled_date", from);
    }
    if (to) {
      query = query.lte("scheduled_date", to);
    }
    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data: reservations, error } = await query;
    if (error) {
      console.error("[reservations] db_error:", error.message);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }

    // 顧客名・車両情報を並列で取得
    const customerIds = [...new Set((reservations ?? []).map((r) => r.customer_id).filter(Boolean))];
    const vehicleIds = [...new Set((reservations ?? []).map((r) => r.vehicle_id).filter(Boolean))];
    const customerMap: Record<string, string> = {};
    const vehicleMap: Record<string, string> = {};

    const [customersResult, vehiclesResult] = await Promise.all([
      customerIds.length > 0
        ? supabase.from("customers").select("id, name").in("id", customerIds)
        : Promise.resolve({ data: null }),
      vehicleIds.length > 0
        ? supabase.from("vehicles").select("id, maker, model, year, plate_display").in("id", vehicleIds)
        : Promise.resolve({ data: null }),
    ]);

    (customersResult.data ?? []).forEach((c: { id: string; name: string }) => {
      customerMap[c.id] = c.name;
    });
    (vehiclesResult.data ?? []).forEach((v: { id: string; maker: string; model: string; year: number | null; plate_display: string | null }) => {
      const label = [v.maker, v.model, v.year ? String(v.year) : null].filter(Boolean).join(" ") || "車両";
      vehicleMap[v.id] = v.plate_display ? `${label} / ${v.plate_display}` : label;
    });

    const enriched = (reservations ?? []).map((r) => ({
      ...r,
      customer_name: r.customer_id ? (customerMap[r.customer_id] ?? null) : null,
      vehicle_label: r.vehicle_id ? (vehicleMap[r.vehicle_id] ?? null) : null,
    }));

    // 統計
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = enriched.filter((r) => r.scheduled_date === today && r.status !== "cancelled").length;
    const activeCount = enriched.filter((r) => r.status !== "cancelled" && r.status !== "completed").length;

    return NextResponse.json({
      reservations: enriched,
      stats: {
        total: enriched.length,
        today_count: todayCount,
        active_count: activeCount,
      },
    });
  } catch (e: unknown) {
    console.error("reservations list failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── POST: 予約作成 ───
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const deny = await enforceBilling(req as any, { minPlan: "starter", action: "reservation_create" });
    if (deny) return deny as any;

    const body = await req.json().catch(() => ({}));
    const parsed = reservationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.errors[0]?.message ?? "入力が不正です。", {
        issues: parsed.error.errors,
      });
    }

    const d = parsed.data;
    const row = {
      id: crypto.randomUUID(),
      tenant_id: caller.tenantId,
      customer_id: d.customer_id ?? null,
      vehicle_id: d.vehicle_id ?? null,
      title: d.title,
      menu_items_json: d.menu_items_json ?? [],
      note: d.note ?? null,
      scheduled_date: d.scheduled_date,
      start_time: d.start_time ?? null,
      end_time: d.end_time ?? null,
      assigned_user_id: d.assigned_user_id ?? null,
      status: d.status,
      estimated_amount: d.estimated_amount ?? 0,
    };

    const { data, error } = await supabase.from("reservations").insert(row).select().single();
    if (error) {
      console.error("[reservations] insert_failed:", error.message);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    // ── Google Calendar 同期（非ブロッキング） ──
    syncCreateEvent(caller.tenantId, {
      id: data.id,
      title: data.title,
      scheduled_date: data.scheduled_date,
      start_time: data.start_time,
      end_time: data.end_time,
      note: data.note,
      customer_name: null,
      vehicle_label: null,
    }).catch((e) => console.error("[reservations] gcal sync create failed:", e));

    return NextResponse.json({ ok: true, reservation: data });
  } catch (e: unknown) {
    console.error("reservation create failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── PUT: 予約更新 ───
export async function PUT(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const deny = await enforceBilling(req as any, { minPlan: "starter", action: "reservation_update" });
    if (deny) return deny as any;

    const body = await req.json().catch(() => ({}));
    const parsed = reservationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.errors[0]?.message ?? "入力が不正です。", {
        issues: parsed.error.errors,
      });
    }

    const { id, ...fields } = parsed.data;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (fields.title !== undefined) updates.title = fields.title;
    if (fields.customer_id !== undefined) updates.customer_id = fields.customer_id ?? null;
    if (fields.vehicle_id !== undefined) updates.vehicle_id = fields.vehicle_id ?? null;
    if (fields.menu_items_json !== undefined) updates.menu_items_json = fields.menu_items_json;
    if (fields.note !== undefined) updates.note = fields.note ?? null;
    if (fields.scheduled_date !== undefined) updates.scheduled_date = fields.scheduled_date;
    if (fields.start_time !== undefined) updates.start_time = fields.start_time ?? null;
    if (fields.end_time !== undefined) updates.end_time = fields.end_time ?? null;
    if (fields.assigned_user_id !== undefined) updates.assigned_user_id = fields.assigned_user_id ?? null;
    if (fields.estimated_amount !== undefined) updates.estimated_amount = fields.estimated_amount ?? 0;

    // ステータス変更
    if (fields.status !== undefined) {
      updates.status = fields.status;
      if (fields.status === "cancelled") {
        updates.cancelled_at = new Date().toISOString();
        updates.cancel_reason = fields.cancel_reason ?? null;
      }
    }

    const { data, error } = await supabase
      .from("reservations")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .select()
      .single();

    if (error) {
      console.error("[reservations] update_failed:", error.message);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    // ── Google Calendar 同期（非ブロッキング） ──
    if (data.status === "cancelled" && data.gcal_event_id) {
      // キャンセル時は GCal イベントを削除
      syncDeleteEvent(caller.tenantId, data.id, data.gcal_event_id)
        .catch((e) => console.error("[reservations] gcal sync delete failed:", e));
    } else if (data.gcal_event_id) {
      // 既存イベントの更新
      syncUpdateEvent(caller.tenantId, {
        id: data.id,
        title: data.title,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        note: data.note,
        gcal_event_id: data.gcal_event_id,
      }).catch((e) => console.error("[reservations] gcal sync update failed:", e));
    } else {
      // gcal_event_id がまだない場合は新規作成
      syncCreateEvent(caller.tenantId, {
        id: data.id,
        title: data.title,
        scheduled_date: data.scheduled_date,
        start_time: data.start_time,
        end_time: data.end_time,
        note: data.note,
      }).catch((e) => console.error("[reservations] gcal sync create failed:", e));
    }

    return NextResponse.json({ ok: true, reservation: data });
  } catch (e: unknown) {
    console.error("reservation update failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

// ─── DELETE: 予約削除（キャンセル扱い） ───
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    if (!requireMinRole(caller, "staff")) return apiForbidden();

    const deny = await enforceBilling(req as any, { minPlan: "starter", action: "reservation_delete" });
    if (deny) return deny as any;

    const body = await req.json().catch(() => ({}));
    const parsed = reservationDeleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiValidationError(parsed.error.errors[0]?.message ?? "入力が不正です。", {
        issues: parsed.error.errors,
      });
    }

    const { id, hard_delete: hardDelete, cancel_reason: parsedCancelReason } = parsed.data;

    if (hardDelete) {
      // 完全削除（キャンセル済み or 完了のみ許可）
      const { data: existing } = await supabase
        .from("reservations")
        .select("status")
        .eq("id", id)
        .eq("tenant_id", caller.tenantId)
        .single();

      if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (existing.status !== "cancelled" && existing.status !== "completed") {
        return NextResponse.json({ error: "active_reservation_cannot_delete" }, { status: 400 });
      }

      const { error: delErr } = await supabase
        .from("reservations")
        .delete()
        .eq("id", id)
        .eq("tenant_id", caller.tenantId);

      if (delErr) {
        console.error("[reservations] hard_delete_failed:", delErr.message);
        return NextResponse.json({ error: "delete_failed" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, deleted: true });
    }

    // ソフトデリート（キャンセル扱い）
    const cancelReason = parsedCancelReason ?? null;

    // キャンセル前に gcal_event_id を取得
    const { data: existing } = await supabase
      .from("reservations")
      .select("gcal_event_id")
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .single();

    const { data, error } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", caller.tenantId)
      .select()
      .single();

    if (error) {
      console.error("[reservations] cancel_failed:", error.message);
      return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
    }

    // ── Google Calendar 同期: イベント削除（非ブロッキング） ──
    if (existing?.gcal_event_id) {
      syncDeleteEvent(caller.tenantId, id, existing.gcal_event_id)
        .catch((e) => console.error("[reservations] gcal sync delete failed:", e));
    }

    return NextResponse.json({ ok: true, reservation: data });
  } catch (e: unknown) {
    console.error("reservation cancel failed", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
