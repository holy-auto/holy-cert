import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanTier = "mini" | "standard" | "pro";

const PRICE_TO_TIER: Record<string, PlanTier> = {
  "price_1T6mOK8STGezcQhAjoFbA93K": "mini",
  "price_1T6mOK8STGezcQhAF7JX62m4": "standard",
  "price_1T6mOK8STGezcQhAjifBSYXJ": "pro",
};

function planFromPriceId(priceId?: string | null): PlanTier | null {
  if (!priceId) return null;
  return PRICE_TO_TIER[priceId] ?? null;
}

function isActiveStatus(status: Stripe.Subscription.Status): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

function asStringId(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in v) return String(v.id);
  return String(v);
}

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as any });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function updateTenant(tenant_id: string, patch: Record<string, any>) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tenants").update(patch).eq("id", tenant_id);
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whsec) {
    return NextResponse.json({ error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
  } catch (e: any) {
    console.error("webhook signature verify failed", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const tenant_id = session.metadata?.tenant_id ?? session.client_reference_id ?? null;
        const plan_tier = (session.metadata?.plan_tier as any) ?? null;

        const customerId = asStringId(session.customer);
        const subscriptionId = asStringId(session.subscription);

        if (!tenant_id) throw new Error("checkout.session.completed: missing tenant_id in metadata/client_reference_id");
        if (!subscriptionId) throw new Error("checkout.session.completed: missing subscription id");

        // plan が metadata に無い場合は subscription の price から推定
        let tier: PlanTier | null = plan_tier;
        if (!tier) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items?.data?.[0]?.price?.id ?? null;
          tier = planFromPriceId(priceId);
        }

        const patch: Record<string, any> = {
          stripe_subscription_id: subscriptionId,
          is_active: true,
        };
        if (customerId) patch.stripe_customer_id = customerId;
        if (tier) patch.plan_tier = tier;

        console.log("webhook: checkout.session.completed", { tenant_id, tier, customerId, subscriptionId });
        await updateTenant(tenant_id, patch);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;

        const tenant_id = sub.metadata?.tenant_id ?? null;
        if (!tenant_id) throw new Error("subscription.*: missing tenant_id in subscription.metadata");

        const customerId = asStringId(sub.customer);
        const subscriptionId = sub.id;

        const priceId = sub.items?.data?.[0]?.price?.id ?? null;
        const tier = planFromPriceId(priceId);
        const active = isActiveStatus(sub.status);

        const patch: Record<string, any> = {
          stripe_subscription_id: subscriptionId,
          is_active: active,
        };
        if (customerId) patch.stripe_customer_id = customerId;
        if (tier) patch.plan_tier = tier;

        console.log("webhook: subscription sync", { tenant_id, tier, active, customerId, subscriptionId });
        await updateTenant(tenant_id, patch);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const tenant_id = sub.metadata?.tenant_id ?? null;
        if (!tenant_id) {
          console.warn("subscription.deleted: missing tenant_id; skip");
          break;
        }

        console.log("webhook: subscription.deleted", { tenant_id, subscriptionId: sub.id });
        await updateTenant(tenant_id, { is_active: false, stripe_subscription_id: sub.id });
        break;
      }

      default:
        break;
    }
  } catch (e: any) {
    console.error("webhook handler failed", { type: event.type, id: event.id, error: e?.message ?? e });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
