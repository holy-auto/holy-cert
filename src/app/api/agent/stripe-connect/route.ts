import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { resolveAgentContextWithEnforce } from "@/lib/agent/statusGuard";
import { checkRateLimit } from "@/lib/api/rateLimit";

export const dynamic = "force-dynamic";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia" as any,
  });
}

/** Prevent open redirect: only allow URLs under our own origin */
function safeUrl(candidate?: string | null, fallback?: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ?? "";
  const safe = fallback ?? `${base}/agent/settings`;
  if (!candidate) return safe;
  if (base && candidate.startsWith(base)) return candidate;
  return safe;
}

// ─── POST: Create or retrieve Stripe Connect onboarding link ───
export async function POST(request: NextRequest) {
  const limited = await checkRateLimit(request, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    // Only admin can set up Stripe Connect
    if (ctx.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Stripe Connect を設定する権限がありません。" },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Fetch agent record to check for existing Stripe account
    const { data: agentProfile, error: profileErr } = await supabase
      .from("agents")
      .select("id, stripe_connect_account_id, name, contact_email")
      .eq("id", ctx.agentId)
      .single();

    if (profileErr || !agentProfile) {
      return NextResponse.json({ error: "agent_profile_not_found" }, { status: 404 });
    }

    const stripe = getStripe();
    let accountId = agentProfile.stripe_connect_account_id as string | null;

    // Create Stripe Connect account if not already linked
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "standard",
        country: "JP",
        email: (agentProfile.contact_email as string) || undefined,
        business_profile: {
          name: (agentProfile.name as string) || undefined,
        },
      });
      accountId = account.id;

      // Save the Stripe account ID to the agents table
      const { error: saveErr } = await supabase
        .from("agents")
        .update({
          stripe_connect_account_id: accountId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.agentId);

      if (saveErr) {
        console.error("[agent/stripe-connect] save account_id error:", saveErr.message);
        // Continue anyway - the Stripe account exists even if we fail to save locally
      }
    }

    // Generate onboarding link
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const returnUrl = safeUrl(body?.return_url as string | undefined);
    const refreshUrl = safeUrl(body?.refresh_url as string | undefined);

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return NextResponse.json({
      ok: true,
      account_id: accountId,
      url: accountLink.url,
    });
  } catch (e: unknown) {
    console.error("[agent/stripe-connect] POST error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "internal_error", message: msg }, { status: 500 });
  }
}

// ─── GET: Check Stripe Connect status for this agent ───
export async function GET(req: NextRequest) {
  const limited = await checkRateLimit(req, "general");
  if (limited) return limited;

  try {
    const { ctx, deny } = await resolveAgentContextWithEnforce();
    if (deny) return deny;

    const supabase = await createClient();

    const { data: agentProfile, error: profileErr } = await supabase
      .from("agents")
      .select("stripe_connect_account_id, stripe_connect_onboarded")
      .eq("id", ctx.agentId)
      .single();

    if (profileErr || !agentProfile) {
      return NextResponse.json({ error: "agent_profile_not_found" }, { status: 404 });
    }

    const accountId = agentProfile.stripe_connect_account_id as string | null;
    if (!accountId) {
      return NextResponse.json({
        connected: false,
        onboarded: false,
        account_id: null,
      });
    }

    // Check actual status from Stripe
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(accountId);

    const onboarded = account.charges_enabled && account.payouts_enabled;

    // Update local state if changed
    if (onboarded !== agentProfile.stripe_connect_onboarded) {
      await supabase
        .from("agents")
        .update({
          stripe_connect_onboarded: onboarded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ctx.agentId);
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      account_id: accountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
  } catch (e: unknown) {
    console.error("[agent/stripe-connect] GET error:", e);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
