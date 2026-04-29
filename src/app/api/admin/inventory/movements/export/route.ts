import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { apiUnauthorized, apiInternalError } from "@/lib/api/response";

export const dynamic = "force-dynamic";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * 在庫入出庫履歴 CSV エクスポート
 *
 * 監査・棚卸差異追跡用。デフォルトは直近 5000 件。
 * `?item_id=...` で特定アイテムに絞り込み可能。
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return apiUnauthorized();

    const url = new URL(req.url);
    const itemId = url.searchParams.get("item_id");

    let query = supabase
      .from("inventory_movements")
      .select("id, type, quantity, reason, reservation_id, created_at, inventory_items(name, sku, unit)")
      .eq("tenant_id", caller.tenantId)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (itemId) query = query.eq("item_id", itemId);

    const { data, error } = await query;
    if (error) return apiInternalError(error, "inventory-movements export");

    const header = [
      "created_at",
      "type",
      "item_name",
      "item_sku",
      "quantity",
      "unit",
      "reason",
      "reservation_id",
      "movement_id",
    ];

    const lines: string[] = [header.join(",")];
    for (const r of data ?? []) {
      const item = (r as { inventory_items?: { name?: string; sku?: string; unit?: string } }).inventory_items;
      lines.push(
        [
          csvEscape(r.created_at),
          csvEscape(r.type),
          csvEscape(item?.name ?? ""),
          csvEscape(item?.sku ?? ""),
          csvEscape(r.quantity),
          csvEscape(item?.unit ?? ""),
          csvEscape(r.reason),
          csvEscape(r.reservation_id),
          csvEscape(r.id),
        ].join(","),
      );
    }

    const filename = `inventory_movements_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse("﻿" + lines.join("\r\n"), {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return apiInternalError(e, "inventory-movements export");
  }
}
