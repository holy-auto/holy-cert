import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveCallerWithRole, requireMinRole } from "@/lib/auth/checkRole";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion });
}

// POST: Stripe Terminal connection token を発行
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const caller = await resolveCallerWithRole(supabase);
    if (!caller || !requireMinRole(caller, "staff")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    const token = await stripe.terminal.connectionTokens.create();

    return NextResponse.json({ secret: token.secret });
  } catch (e: unknown) {
    console.error("[pos/terminal/connection-token] error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal_error" },
      { status: 500 },
    );
  }
}
