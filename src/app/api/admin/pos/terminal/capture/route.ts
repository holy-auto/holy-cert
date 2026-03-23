import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion });
}

// POST: PaymentIntent を capture し、pos_checkout で DB 記録
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller || !requireMinRole(caller, "staff")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const paymentIntentId = String(body?.payment_intent_id ?? "").trim();
    if (!paymentIntentId) {
      return NextResponse.json({ error: "missing_payment_intent_id" }, { status: 400 });
    }

    const stripe = getStripe();

    // Capture the payment
    const pi = await stripe.paymentIntents.capture(paymentIntentId);

    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: "capture_failed", detail: `status: ${pi.status}` },
        { status: 400 },
      );
    }

    // DB に会計記録 (pos_checkout RPC)
    const { data, error } = await supabase.rpc("pos_checkout", {
      p_tenant_id: caller.tenantId,
      p_reservation_id: (String(body?.reservation_id ?? "")).trim() || null,
      p_customer_id: (String(body?.customer_id ?? "")).trim() || null,
      p_store_id: (String(body?.store_id ?? "")).trim() || null,
      p_register_session_id: (String(body?.register_session_id ?? "")).trim() || null,
      p_payment_method: "card",
      p_amount: pi.amount,
      p_received_amount: pi.amount,
      p_items_json: body?.items_json ?? [],
      p_tax_rate: parseInt(String(body?.tax_rate ?? 10), 10),
      p_note: (String(body?.note ?? "")).trim() || `Stripe PI: ${pi.id}`,
      p_create_receipt: true,
      p_user_id: caller.userId,
    });

    if (error) {
      console.error("[pos/terminal/capture] rpc_error:", error.message);
      return NextResponse.json(
        { error: "checkout_record_failed", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, result: data, stripe_payment_intent_id: pi.id });
  } catch (e: unknown) {
    console.error("[pos/terminal/capture] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}
