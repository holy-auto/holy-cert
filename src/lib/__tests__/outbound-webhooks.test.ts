import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { signWebhook, buildWebhookDispatcher, emitTenantEvent } from "@/lib/outbound-webhooks";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));
vi.mock("@/lib/http/withRetry", () => ({
  withRetry: async (_k: string, fn: () => Promise<unknown>) => fn(),
}));

describe("signWebhook", () => {
  it("produces a deterministic HMAC-SHA256 signature", () => {
    const sig = signWebhook("secret", "body", 1700000000);
    const expected = crypto.createHmac("sha256", "secret").update("1700000000.body").digest("hex");
    expect(sig).toBe(`t=1700000000,v1=${expected}`);
  });
});

function fakeAdmin(rows: Array<Record<string, unknown>>) {
  let updates: Array<Record<string, unknown>> = [];
  let inserted: Record<string, unknown> | null = null;
  const admin = {
    from(_table: string) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          return { eq: () => Promise.resolve({ error: null }) };
        },
        insert(doc: Record<string, unknown>) {
          inserted = doc;
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: "new-id" }, error: null }) }),
          };
        },
        // .select returns rows when terminating call (no further chain): emulate by returning
        // a thenable on the first .select() since our dispatcher calls .from().select().eq().eq()
        // and awaits.
        then(cb: (v: { data: typeof rows; error: null }) => unknown) {
          return Promise.resolve(cb({ data: rows, error: null }));
        },
      };
    },
  };
  return {
    admin: admin as unknown as Parameters<typeof buildWebhookDispatcher>[0],
    getUpdates: () => updates,
    getInserted: () => inserted,
  };
}

describe("emitTenantEvent", () => {
  it("enqueues an outbox row with topic='webhook'", async () => {
    const { admin, getInserted } = fakeAdmin([]);
    await emitTenantEvent(admin, {
      tenantId: "t1",
      topic: "certificate.issued",
      aggregateId: "cert-1",
      payload: { foo: "bar" },
    });
    const ins = getInserted() as Record<string, unknown> | null;
    expect(ins).toBeTruthy();
    expect(ins).toMatchObject({
      tenant_id: "t1",
      topic: "webhook",
      aggregate_id: "cert-1",
    });
  });
});

describe("buildWebhookDispatcher", () => {
  beforeEach(() => {
    // Mock fetch globally for delivery attempts.
    global.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
  });

  it("returns ok when no subscribers exist", async () => {
    const { admin } = fakeAdmin([]);
    const dispatcher = buildWebhookDispatcher(admin);
    const r = await dispatcher({
      id: "evt-1",
      tenant_id: "t1",
      topic: "webhook",
      payload: { event_topic: "certificate.issued", data: {} },
      aggregate_id: null,
      attempts: 0,
      status: "pending",
      next_attempt_at: new Date().toISOString(),
    });
    expect(r.ok).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns error when event_topic is missing in payload", async () => {
    const { admin } = fakeAdmin([]);
    const dispatcher = buildWebhookDispatcher(admin);
    const r = await dispatcher({
      id: "evt-1",
      tenant_id: "t1",
      topic: "webhook",
      payload: {},
      aggregate_id: null,
      attempts: 0,
      status: "pending",
      next_attempt_at: new Date().toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("missing_event_topic");
  });
});
