import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { getListingById, updateListing } from "@/lib/market/db";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// GET: 在庫詳細
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 自分の掲載でなければ notes を除外
  if (listing.dealer_id !== session.dealer.id) {
    const { notes: _notes, ...publicListing } = listing;
    return NextResponse.json({ listing: publicListing });
  }

  return NextResponse.json({ listing });
}

// PATCH: 在庫更新（オーナーのみ）
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const listing = await updateListing(id, session.dealer.id, body);
    return NextResponse.json({ listing });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE: 在庫削除（オーナーのみ）
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("inventory_listings")
    .select("dealer_id, status")
    .eq("id", id)
    .single();

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (listing.dealer_id !== session.dealer.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (listing.status === "sold") {
    return NextResponse.json({ error: "Cannot delete a sold listing" }, { status: 400 });
  }

  await admin.from("inventory_listings").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
