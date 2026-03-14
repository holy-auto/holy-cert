import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createInquiry, getDealerInquiries } from "@/lib/market/db";
import { notifyNewInquiry } from "@/lib/market/email";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: 自分の問い合わせ一覧（送受信両方）
export async function GET() {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const inquiries = await getDealerInquiries(session.dealer.id);
    return NextResponse.json({ inquiries });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: 新規問い合わせ
export async function POST(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.listing_id || !body.message?.trim()) {
    return NextResponse.json({ error: "listing_id and message are required" }, { status: 400 });
  }

  try {
    const inquiry = await createInquiry(session.dealer.id, {
      listing_id: body.listing_id,
      message: body.message.trim(),
    });

    // 出品業者に通知（非同期・失敗しても業務フロー継続）
    const admin = createAdminClient();
    const { data: listing } = await admin
      .from("inventory_listings")
      .select("make, model, year, dealer_id")
      .eq("id", body.listing_id)
      .single();

    if (listing) {
      notifyNewInquiry({
        toDealerId: listing.dealer_id,
        fromCompany: session.dealer.company_name,
        make: listing.make,
        model: listing.model,
        year: listing.year,
        inquiryId: inquiry.id,
        messagePreview: body.message.trim(),
      }).catch((err) => console.error("[market/inquiries] notifyNewInquiry failed", err));
    }

    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const status = message.includes("not available") || message.includes("own listing") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
