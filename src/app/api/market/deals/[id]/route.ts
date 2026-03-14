import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { updateDealStatus } from "@/lib/market/db";
import { notifyDealStatusChanged } from "@/lib/market/email";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// PATCH: 商談ステータス更新
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const validStatuses = ["agreed", "completed", "cancelled"] as const;
  if (!validStatuses.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const deal = await updateDealStatus(id, session.dealer.id, body.status);

    // 相手方に通知（非同期）
    const admin = createAdminClient();
    const { data: listing } = await admin
      .from("inventory_listings")
      .select("make, model, year")
      .eq("id", deal.listing_id)
      .single();

    if (listing) {
      notifyDealStatusChanged({
        dealId: deal.id,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        newStatus: body.status,
        updaterCompany: session.dealer.company_name,
        buyerDealerId: deal.buyer_dealer_id,
        sellerDealerId: deal.seller_dealer_id,
        updaterDealerId: session.dealer.id,
      }).catch((err) => console.error("[market/deals/patch] notifyDealStatusChanged failed", err));
    }

    return NextResponse.json({ deal });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("forbidden") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
