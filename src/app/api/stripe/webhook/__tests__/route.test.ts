/**
 * Stripe webhook integration test.
 *
 * Focus: invariants that protect billing reliability — signature
 * verification, idempotent claim semantics, 503 retry path on
 * transient DB errors. Per-event business logic is NOT exercised
 * here; that belongs in narrower unit tests around helpers like
 * `priceIdToPlanTier` or `confirmCampaignSlot`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructEventMock, supabaseInsertMock, supabaseClaimResultRef } = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  supabaseInsertMock: vi.fn(),
  supabaseClaimResultRef: {
    current: { data: null as { id: string } | null, error: null as { code: string; message: string } | null },
  },
}));

vi.mock("stripe", () => {
  class FakeStripe {
    webhooks = { constructEvent: constructEventMock };
  }
  return { default: FakeStripe };
});

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleAdmin: () => ({
    from: (table: string) => {
      if (table === "stripe_processed_events") {
        // chain: .insert(...).select(...).single()
        return {
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve(supabaseClaimResultRef.current),
            }),
          }),
        };
      }
      // generic chain for downstream branches we don't exercise
      return {
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        select: () => ({
          eq: () => ({
            in: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        }),
      };
    },
    auth: { admin: { getUserById: () => Promise.resolve({ data: { user: null }, error: null }) } },
  }),
}));

vi.mock("@/lib/observability/sentry", () => ({
  captureSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
  maskEmail: (s: string) => s,
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "@/app/api/stripe/webhook/route";
import { captureSecurityEvent } from "@/lib/observability/sentry";

function webhookReq(body: string, signature: string | null): import("next/server").NextRequest {
  const headers = new Headers({ "content-type": "application/json" });
  if (signature !== null) headers.set("stripe-signature", signature);
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers,
    body,
  }) as unknown as import("next/server").NextRequest;
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    supabaseInsertMock.mockReset();
    supabaseClaimResultRef.current = { data: { id: "claim-1" }, error: null };
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(webhookReq("{}", null));
    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 when STRIPE_WEBHOOK_SECRET is unset", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await POST(webhookReq("{}", "sig_xyz"));
    expect(res.status).toBe(400);
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it("returns 400 + emits security event when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("invalid sig");
    });

    const res = await POST(webhookReq("{}", "sig_bad"));
    expect(res.status).toBe(400);
    expect(captureSecurityEvent).toHaveBeenCalledWith(
      "webhook_signature_failed",
      expect.objectContaining({ provider: "stripe" }),
    );
  });

  it("returns 200 + duplicate=true when the event was already claimed (23505)", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_dup",
      type: "customer.subscription.updated",
      data: { object: {} },
    });
    supabaseClaimResultRef.current = {
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    };

    const res = await POST(webhookReq("{}", "sig_ok"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { received?: boolean; duplicate?: boolean };
    expect(body.received).toBe(true);
    expect(body.duplicate).toBe(true);
  });

  it("returns 503 when the idempotency claim fails with a non-unique DB error (Stripe will retry)", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_db_down",
      type: "customer.subscription.updated",
      data: { object: {} },
    });
    supabaseClaimResultRef.current = {
      data: null,
      error: { code: "08006", message: "connection failure" },
    };

    const res = await POST(webhookReq("{}", "sig_ok"));
    // 503 is the explicit "please retry" contract for Stripe — see route comment.
    expect(res.status).toBe(503);
  });

  it("returns 200 for an event type we don't branch on, after a successful claim", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_unhandled",
      type: "ping.something_else",
      data: { object: {} },
    });

    const res = await POST(webhookReq("{}", "sig_ok"));
    // The route returns apiJson({ received: true }) for any path that falls
    // through the switch without throwing, so this case must be 200.
    expect(res.status).toBe(200);
  });
});
