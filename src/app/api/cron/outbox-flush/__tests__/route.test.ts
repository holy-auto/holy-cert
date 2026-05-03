import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyCronRequest: vi.fn(),
  withCronLock: vi.fn(),
  processOutboxBatch: vi.fn(),
  buildWebhookDispatcher: vi.fn().mockReturnValue(() => Promise.resolve({ ok: true })),
  sendCronFailureAlert: vi.fn().mockResolvedValue(undefined),
  createServiceRoleAdmin: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/cronAuth", () => ({ verifyCronRequest: mocks.verifyCronRequest }));
vi.mock("@/lib/cron/lock", () => ({ withCronLock: mocks.withCronLock }));
vi.mock("@/lib/outbox", () => ({ processOutboxBatch: mocks.processOutboxBatch }));
vi.mock("@/lib/outbound-webhooks", () => ({ buildWebhookDispatcher: mocks.buildWebhookDispatcher }));
vi.mock("@/lib/cronAlert", () => ({ sendCronFailureAlert: mocks.sendCronFailureAlert }));
vi.mock("@/lib/supabase/admin", () => ({ createServiceRoleAdmin: mocks.createServiceRoleAdmin }));
vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { GET } from "@/app/api/cron/outbox-flush/route";
import type { NextRequest } from "next/server";

function req(): NextRequest {
  return new Request("http://localhost/api/cron/outbox-flush") as unknown as NextRequest;
}

beforeEach(() => {
  Object.values(mocks).forEach((m) => "mockReset" in m && m.mockReset?.());
  mocks.buildWebhookDispatcher.mockReturnValue(() => Promise.resolve({ ok: true }));
  mocks.createServiceRoleAdmin.mockReturnValue({});
  mocks.sendCronFailureAlert.mockResolvedValue(undefined);
});

describe("GET /api/cron/outbox-flush", () => {
  it("401 when cron auth fails", async () => {
    mocks.verifyCronRequest.mockReturnValueOnce({ authorized: false, error: "no_auth" });
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("returns skipped when lock not acquired", async () => {
    mocks.verifyCronRequest.mockReturnValueOnce({ authorized: true });
    mocks.withCronLock.mockResolvedValueOnce({ acquired: false });
    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { skipped?: string };
    expect(body.skipped).toBe("lock_held");
  });

  it("invokes processOutboxBatch with webhook dispatcher and returns stats", async () => {
    mocks.verifyCronRequest.mockReturnValueOnce({ authorized: true });
    const stats = { processed: 5, delivered: 4, errored: 1, dead: 0 };
    mocks.processOutboxBatch.mockResolvedValueOnce(stats);
    mocks.withCronLock.mockImplementationOnce(async (_admin, _task, _ttl, fn: () => Promise<unknown>) => ({
      acquired: true,
      value: await fn(),
    }));

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, number | boolean>;
    expect(body.processed).toBe(5);
    expect(body.delivered).toBe(4);
    expect(body.errored).toBe(1);
    expect(mocks.processOutboxBatch).toHaveBeenCalledOnce();
    const dispatchers = mocks.processOutboxBatch.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(dispatchers)).toEqual(["webhook"]);
  });

  it("emits cron failure alert on exception", async () => {
    mocks.verifyCronRequest.mockReturnValueOnce({ authorized: true });
    mocks.withCronLock.mockRejectedValueOnce(new Error("boom"));
    const res = await GET(req());
    expect(res.status).toBe(500);
    expect(mocks.sendCronFailureAlert).toHaveBeenCalledWith("outbox-flush", "boom");
  });
});
