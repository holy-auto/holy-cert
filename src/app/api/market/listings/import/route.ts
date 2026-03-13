import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createListing } from "@/lib/market/db";

// CSV カラム定義
// make,model,grade,year,mileage,color,body_type,fuel_type,transmission,price_man,
// has_inspection,inspection_expiry,has_repair,repair_notes,description,notes

function parseRow(headers: string[], values: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? "").trim(); });
  return row;
}

function toBool(v: string): boolean {
  return v === "1" || v.toLowerCase() === "true" || v === "yes" || v === "○";
}

export async function POST(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
    return NextResponse.json({ error: "CSV ファイルをアップロードしてください" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return NextResponse.json({ error: "ヘッダー行とデータ行が必要です" }, { status: 400 });
  }

  const headers = lines[0].split(",");
  const results: { row: number; status: "ok" | "error"; error?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");
    const row = parseRow(headers, values);

    try {
      await createListing(session.dealer.id, {
        make: row.make || "",
        model: row.model || "",
        grade: row.grade || undefined,
        year: row.year ? Number(row.year) : undefined,
        mileage: row.mileage ? Number(row.mileage) : undefined,
        color: row.color || undefined,
        body_type: row.body_type || undefined,
        fuel_type: row.fuel_type || undefined,
        transmission: row.transmission || undefined,
        // price_man は万円単位
        price: row.price_man ? Math.round(Number(row.price_man) * 10000) : undefined,
        has_vehicle_inspection: row.has_inspection ? toBool(row.has_inspection) : false,
        inspection_expiry: row.inspection_expiry || undefined,
        has_repair_history: row.has_repair ? toBool(row.has_repair) : false,
        repair_history_notes: row.repair_notes || undefined,
        description: row.description || undefined,
        notes: row.notes || undefined,
      });
      results.push({ row: i, status: "ok" });
    } catch (e: unknown) {
      results.push({ row: i, status: "error", error: e instanceof Error ? e.message : "Unknown" });
    }
  }

  const succeeded = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error");
  return NextResponse.json({ succeeded, failed, total: results.length });
}
