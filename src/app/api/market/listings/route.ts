import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createListing, searchListings } from "@/lib/market/db";
import type { ListingSearchParams } from "@/types/market";

// GET: 在庫一覧検索（全ディーラー共有）
export async function GET(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;

  const params: ListingSearchParams = {
    q: searchParams.get("q") ?? undefined,
    prefecture: searchParams.get("prefecture") ?? undefined,
    make: searchParams.get("make") ?? undefined,
    body_type: searchParams.get("body_type") ?? undefined,
    fuel_type: searchParams.get("fuel_type") ?? undefined,
    transmission: searchParams.get("transmission") ?? undefined,
    year_min: searchParams.has("year_min") ? Number(searchParams.get("year_min")) : undefined,
    year_max: searchParams.has("year_max") ? Number(searchParams.get("year_max")) : undefined,
    price_min: searchParams.has("price_min") ? Number(searchParams.get("price_min")) : undefined,
    price_max: searchParams.has("price_max") ? Number(searchParams.get("price_max")) : undefined,
    mileage_max: searchParams.has("mileage_max") ? Number(searchParams.get("mileage_max")) : undefined,
    has_vehicle_inspection: searchParams.has("has_vehicle_inspection")
      ? searchParams.get("has_vehicle_inspection") === "true"
      : undefined,
    has_repair_history: searchParams.has("has_repair_history")
      ? searchParams.get("has_repair_history") === "true"
      : undefined,
    page: searchParams.has("page") ? Number(searchParams.get("page")) : 1,
    limit: searchParams.has("limit") ? Number(searchParams.get("limit")) : 20,
  };

  try {
    const result = await searchListings(params);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 在庫掲載作成
export async function POST(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.make?.trim() || !body.model?.trim()) {
    return NextResponse.json({ error: "make and model are required" }, { status: 400 });
  }

  try {
    const listing = await createListing(session.dealer.id, body);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
