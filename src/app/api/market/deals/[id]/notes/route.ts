import { NextRequest, NextResponse } from "next/server";
import { getDealerSession } from "@/lib/market/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

// PATCH: 商談メモ更新
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getDealerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const notes: string = body.notes ?? "";

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("deals")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .or(`buyer_dealer_id.eq.${session.dealer.id},seller_dealer_id.eq.${session.dealer.id}`)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  }
  return NextResponse.json({ notes: data.notes });
}
