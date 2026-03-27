import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole } from "@/lib/auth/checkRole";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveBaseUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

const PLATFORM_FEE_RATE = 0.05; // 5%

/**
 * POST /api/admin/orders/[id]/pay
 * 発注者が Stripe Connect 経由で受注者に支払う
 * → Checkout Session を生成し、受注者の Connect アカウントへ送金
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = caller.tenantId;
    const admin = getSupabaseAdmin();

    // 注文取得
    const { data: order, error: fetchErr } = await admin
      .from("job_orders")
      .select("*")
      .eq("id", id)
      .eq("from_tenant_id", tenantId) // 発注者のみが支払い可能
      .single();

    if (fetchErr || !order) {
      return NextResponse.json({ error: "注文が見つかりません" }, { status: 404 });
    }

    if (order.status !== "payment_pending") {
      return NextResponse.json(
        { error: "支払待ちステータスの注文のみ決済できます" },
        { status: 400 },
      );
    }

    // 支払金額: accepted_amount > budget > 0
    const amount = Math.round(Number(order.accepted_amount ?? order.budget ?? 0));
    if (amount <= 0) {
      return NextResponse.json(
        { error: "支払金額が設定されていません。合意金額または予算を設定してください。" },
        { status: 400 },
      );
    }

    // 受注者の Connect アカウントを確認
    if (!order.to_tenant_id) {
      return NextResponse.json({ error: "受注者が未設定です" }, { status: 400 });
    }

    const { data: vendorTenant } = await admin
      .from("tenants")
      .select("id, name, stripe_connect_account_id, stripe_connect_onboarded")
      .eq("id", order.to_tenant_id)
      .single();

    if (!vendorTenant) {
      return NextResponse.json({ error: "受注者テナントが見つかりません" }, { status: 404 });
    }

    if (!vendorTenant.stripe_connect_account_id || !vendorTenant.stripe_connect_onboarded) {
      return NextResponse.json(
        { error: "受注者が Stripe Connect のオンボーディングを完了していません。銀行振込等の別の支払方法をご利用ください。" },
        { status: 400 },
      );
    }

    // Checkout Session 作成
    const stripe = getStripe();
    const baseUrl = resolveBaseUrl({ req });
    const applicationFee = Math.round(amount * PLATFORM_FEE_RATE);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: order.title ?? `案件 ${order.order_number ?? id.slice(0, 8)}`,
              description: vendorTenant.name ? `${vendorTenant.name} への支払い` : undefined,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: vendorTenant.stripe_connect_account_id as string,
        },
      },
      success_url: `${baseUrl}/admin/orders/${id}?payment=success`,
      cancel_url: `${baseUrl}/admin/orders/${id}?payment=cancel`,
      metadata: {
        source: "order_payment",
        job_order_id: id,
        from_tenant_id: tenantId,
        to_tenant_id: order.to_tenant_id,
      },
    });

    return NextResponse.json({
      ok: true,
      checkout_url: session.url,
      session_id: session.id,
      amount,
      platform_fee: applicationFee,
    });
  } catch (e: unknown) {
    console.error("[orders/pay] failed:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
