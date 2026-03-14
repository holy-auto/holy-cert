import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { replyInquiry } from "@/lib/market/db";
import { notifyInquiryReply } from "@/lib/market/email";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (!body.message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const message = await replyInquiry(id, session.dealer.id, body.message.trim());

    // 相手方に返信通知（非同期）
    const admin = createAdminClient();
    const { data: inquiry } = await admin
      .from("listing_inquiries")
      .select(`
        from_dealer_id,
        to_dealer_id,
        listing:inventory_listings(make, model, year)
      `)
      .eq("id", id)
      .single();

    if (inquiry) {
      // 送信者でない方に通知
      const recipientId =
        inquiry.from_dealer_id === session.dealer.id
          ? inquiry.to_dealer_id
          : inquiry.from_dealer_id;

      const listing = inquiry.listing as { make: string; model: string; year: number | null } | null;

      notifyInquiryReply({
        toDealerId: recipientId,
        fromCompany: session.dealer.company_name,
        make: listing?.make ?? "",
        model: listing?.model ?? "",
        year: listing?.year,
        inquiryId: id,
        messagePreview: body.message.trim(),
      }).catch((err) => console.error("[market/reply] notifyInquiryReply failed", err));
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Forbidden" ? 403 : msg.includes("closed") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
