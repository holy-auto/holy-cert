import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createDeal, getDealerDeals } from "@/lib/market/db";
import { notifyDealStarted } from "@/lib/market/email";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: 自分の商談一覧
export async function GET() {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const deals = await getDealerDeals(session.dealer.id);
    return NextResponse.json({ deals });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 商談開始（出品者のみ）
export async function POST(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.listing_id || !body.inquiry_id) {
    return NextResponse.json(
      { error: "listing_id and inquiry_id are required" },
      { status: 400 }
    );
  }

  try {
    const deal = await createDeal(session.dealer.id, body);

    // 購入業者に通知（非同期）
    const admin = createAdminClient();
    const { data: listing } = await admin
      .from("inventory_listings")
      .select("make, model, year")
      .eq("id", body.listing_id)
      .single();

    if (listing) {
      notifyDealStarted({
        buyerDealerId: deal.buyer_dealer_id,
        sellerCompany: session.dealer.company_name,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        agreedPrice: deal.agreed_price,
        dealId: deal.id,
      }).catch((err) => console.error("[market/deals] notifyDealStarted failed", err));
    }

    return NextResponse.json({ deal }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
