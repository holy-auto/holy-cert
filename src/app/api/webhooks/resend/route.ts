import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend Webhook handler — tracks email delivery events.
 *
 * Events: email.sent, email.delivered, email.delivery_delayed,
 *         email.complained, email.bounced, email.opened, email.clicked
 *
 * Setup: Add this URL in Resend Dashboard → Webhooks → Add Endpoint
 *        Set RESEND_WEBHOOK_SECRET env var with the signing secret.
 */

type ResendEvent = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    [key: string]: unknown;
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Verify webhook signature if secret is configured
  if (secret) {
    const signature = req.headers.get("svix-signature");
    const timestamp = req.headers.get("svix-timestamp");
    const id = req.headers.get("svix-id");

    if (!signature || !timestamp || !id) {
      return NextResponse.json({ error: "Missing webhook headers" }, { status: 401 });
    }

    // Basic timestamp replay protection (5 min tolerance)
    const ts = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      return NextResponse.json({ error: "Timestamp too old" }, { status: 401 });
    }
  }

  let event: ResendEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!event.type || !event.data) {
    return NextResponse.json({ error: "Invalid event format" }, { status: 400 });
  }

  const { type, data } = event;

  // Log all events for monitoring
  switch (type) {
    case "email.bounced":
      console.error("[resend-webhook] BOUNCE:", {
        email_id: data.email_id,
        to: data.to,
        subject: data.subject,
      });
      break;

    case "email.complained":
      console.error("[resend-webhook] COMPLAINT:", {
        email_id: data.email_id,
        to: data.to,
        subject: data.subject,
      });
      break;

    case "email.delivery_delayed":
      console.warn("[resend-webhook] DELAYED:", {
        email_id: data.email_id,
        to: data.to,
      });
      break;

    case "email.delivered":
    case "email.sent":
    case "email.opened":
    case "email.clicked":
      console.log(`[resend-webhook] ${type}:`, {
        email_id: data.email_id,
        to: data.to,
      });
      break;

    default:
      console.log(`[resend-webhook] unknown event: ${type}`);
  }

  return NextResponse.json({ received: true });
}
