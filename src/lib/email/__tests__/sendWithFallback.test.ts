import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendResendEmailMock, enqueueOutboxEventMock } = vi.hoisted(() => ({
  sendResendEmailMock: vi.fn(),
  enqueueOutboxEventMock: vi.fn(),
}));

vi.mock("@/lib/email/resendSend", async () => {
  const actual = await vi.importActual<typeof import("@/lib/email/resendSend")>("@/lib/email/resendSend");
  return {
    ...actual,
    sendResendEmail: (...args: unknown[]) => sendResendEmailMock(...args),
  };
});

vi.mock("@/lib/outbox", () => ({
  enqueueOutboxEvent: (...args: unknown[]) => enqueueOutboxEventMock(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

import { sendEmailWithFallback, buildEmailDispatcher } from "@/lib/email/sendWithFallback";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeAdmin = {} as any;
const ctx = { tenantId: "t-1", outboxAdmin: fakeAdmin };

describe("sendEmailWithFallback", () => {
  beforeEach(() => {
    sendResendEmailMock.mockReset();
    enqueueOutboxEventMock.mockReset();
  });

  it("returns mode=sent on Resend success — no outbox enqueue", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: true, id: "msg_123" });

    const res = await sendEmailWithFallback({ to: "u@example.com", subject: "hi", html: "<p>hi</p>" }, ctx);

    expect(res).toEqual({ ok: true, mode: "sent", id: "msg_123" });
    expect(enqueueOutboxEventMock).not.toHaveBeenCalled();
  });

  it("returns ok=false for permanent 4xx — does NOT enqueue", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 422, error: "invalid to address" });

    const res = await sendEmailWithFallback({ to: "garbage", subject: "x" }, ctx);

    expect(res).toEqual({ ok: false, status: 422, error: "invalid to address" });
    expect(enqueueOutboxEventMock).not.toHaveBeenCalled();
  });

  it("enqueues to outbox on 5xx (transient) and returns mode=queued", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 503, error: "service unavailable" });
    enqueueOutboxEventMock.mockResolvedValueOnce({ ok: true, id: "outbox-9" });

    const res = await sendEmailWithFallback(
      { to: "u@example.com", subject: "hi", html: "<p>hi</p>", idempotencyKey: "key-abc" },
      ctx,
    );

    expect(res).toEqual({ ok: true, mode: "queued", outboxId: "outbox-9" });

    expect(enqueueOutboxEventMock).toHaveBeenCalledOnce();
    const call = enqueueOutboxEventMock.mock.calls[0][1] as {
      tenantId: string;
      topic: string;
      aggregateId: string | null;
      payload: { message: { subject: string }; initialError: { status: number } };
    };
    expect(call.tenantId).toBe("t-1");
    expect(call.topic).toBe("email.send");
    expect(call.aggregateId).toBe("key-abc");
    expect(call.payload.message.subject).toBe("hi");
    expect(call.payload.initialError.status).toBe(503);
  });

  it("enqueues on 429 (rate-limited) — Resend will likely accept later", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 429, error: "rate limited" });
    enqueueOutboxEventMock.mockResolvedValueOnce({ ok: true, id: "outbox-10" });

    const res = await sendEmailWithFallback({ to: "u@example.com", subject: "x" }, ctx);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.mode).toBe("queued");
  });

  it("returns ok=false when BOTH Resend AND outbox enqueue fail", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 503, error: "down" });
    enqueueOutboxEventMock.mockResolvedValueOnce({ ok: false, error: "outbox down too" });

    const res = await sendEmailWithFallback({ to: "u@example.com", subject: "x" }, ctx);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("inline+queue both failed");
  });
});

describe("buildEmailDispatcher", () => {
  beforeEach(() => {
    sendResendEmailMock.mockReset();
  });

  it("retries via sendResendEmail and returns ok on success", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: true, id: "msg_retry" });
    const dispatch = buildEmailDispatcher();

    const result = await dispatch({
      id: "outbox-1",
      payload: {
        message: { to: "u@example.com", subject: "queued", html: "<p>hi</p>", idempotency_key: "k1" },
      },
    });

    expect(result).toEqual({ ok: true });
    const callMsg = sendResendEmailMock.mock.calls[0][0];
    expect(callMsg.to).toBe("u@example.com");
    expect(callMsg.idempotencyKey).toBe("k1"); // re-mapped from snake_case payload
  });

  it("returns ok=false on 5xx so outbox-flush retries with exponential backoff", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 503, error: "still down" });
    const dispatch = buildEmailDispatcher();

    const result = await dispatch({
      id: "outbox-2",
      payload: { message: { to: "u@example.com", subject: "x" } },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("503");
  });

  it("returns ok=true (drop row) on permanent 4xx so we don't dead-letter a never-deliverable address", async () => {
    sendResendEmailMock.mockResolvedValueOnce({ ok: false, status: 422, error: "bad address" });
    const dispatch = buildEmailDispatcher();

    const result = await dispatch({
      id: "outbox-3",
      payload: { message: { to: "bad", subject: "x" } },
    });

    expect(result).toEqual({ ok: true });
  });

  it("rejects malformed payloads (missing message) without calling Resend", async () => {
    const dispatch = buildEmailDispatcher();

    const result = await dispatch({ id: "outbox-4", payload: {} });

    expect(result.ok).toBe(false);
    expect(sendResendEmailMock).not.toHaveBeenCalled();
  });
});
