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

// POST: POS カード決済用 PaymentIntent を作成
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller || !requireMinRole(caller, "staff")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}) as Record<string, unknown>);

    const amount = parseInt(String(body?.amount ?? 0), 10);
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    }

    const description = String(body?.description ?? "POS会計");

    const stripe = getStripe();

    // Stripe Terminal 用の PaymentIntent (capture_method: manual でサーバー側で確定)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "jpy",
      description,
      capture_method: "manual",
      payment_method_types: ["card_present"],
      metadata: {
        tenant_id: caller.tenantId,
        pos: "true",
      },
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (e: unknown) {
    console.error("[pos/terminal/create-payment-intent] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}

// GET: PaymentIntent のステータスを確認（フォールバックポーリング用）
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller || !requireMinRole(caller, "staff")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "missing_id" }, { status: 400 });
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(id);

    // テナントIDの照合
    if (pi.metadata?.tenant_id !== caller.tenantId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ status: pi.status, amount: pi.amount });
  } catch (e: unknown) {
    console.error("[pos/terminal/create-payment-intent GET] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}
