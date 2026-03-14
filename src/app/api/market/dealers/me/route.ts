import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { updateDealer } from "@/lib/market/db";

export async function GET() {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ dealer: session.dealer, dealer_user: session.dealerUser });
}

export async function PATCH(req: NextRequest) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { company_name, contact_name, phone, address, prefecture } = body;

  if (company_name !== undefined && !company_name.trim()) {
    return NextResponse.json({ error: "company_name cannot be empty" }, { status: 400 });
  }

  try {
    const dealer = await updateDealer(session.dealer.id, {
      ...(company_name !== undefined ? { company_name: company_name.trim() } : {}),
      ...(contact_name !== undefined ? { contact_name: contact_name?.trim() || null } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      ...(address !== undefined ? { address: address?.trim() || null } : {}),
      ...(prefecture !== undefined ? { prefecture: prefecture?.trim() || null } : {}),
    });
    return NextResponse.json({ dealer });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
