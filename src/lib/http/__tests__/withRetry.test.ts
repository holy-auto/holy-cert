import { describe, it, expect, beforeEach, vi } from "vitest";
import { withRetry, CircuitOpenError, __resetBreakersForTest } from "@/lib/http/withRetry";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));

describe("withRetry", () => {
  beforeEach(() => __resetBreakersForTest());

  it("returns success on first attempt without sleeping", async () => {
    const thunk = vi.fn().mockResolvedValue("ok");
    const r = await withRetry("k1", thunk, { maxAttempts: 3 });
    expect(r).toBe("ok");
    expect(thunk).toHaveBeenCalledTimes(1);
  });

  it("retries transient 5xx and eventually succeeds", async () => {
    const thunk = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockRejectedValueOnce({ status: 502 })
      .mockResolvedValue("ok");
    const r = await withRetry("k2", thunk, { maxAttempts: 4, initialDelayMs: 1, multiplier: 1, maxDelayMs: 1 });
    expect(r).toBe("ok");
    expect(thunk).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry 4xx (except 408/425/429)", async () => {
    const thunk = vi.fn().mockRejectedValue({ status: 400, message: "bad request" });
    await expect(withRetry("k3", thunk, { maxAttempts: 4, initialDelayMs: 1 })).rejects.toMatchObject({ status: 400 });
    expect(thunk).toHaveBeenCalledTimes(1);
  });

  it("retries 429 rate limited", async () => {
    const thunk = vi.fn().mockRejectedValueOnce({ status: 429 }).mockResolvedValue("ok");
    const r = await withRetry("k4", thunk, { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 1 });
    expect(r).toBe("ok");
    expect(thunk).toHaveBeenCalledTimes(2);
  });

  it("opens the circuit after 5 consecutive failures and rejects further calls", async () => {
    const failing = vi.fn().mockRejectedValue({ status: 500 });
    for (let i = 0; i < 5; i++) {
      await expect(withRetry("burn", failing, { maxAttempts: 1, initialDelayMs: 1 })).rejects.toBeDefined();
    }
    // 6th call should hit open breaker → CircuitOpenError, not even invoking thunk
    failing.mockClear();
    await expect(withRetry("burn", failing, { maxAttempts: 1 })).rejects.toBeInstanceOf(CircuitOpenError);
    expect(failing).not.toHaveBeenCalled();
  });

  it("resets breaker after a success", async () => {
    const flaky = vi.fn().mockRejectedValueOnce({ status: 500 }).mockResolvedValue("ok");
    const r = await withRetry("reset-key", flaky, { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 1 });
    expect(r).toBe("ok");

    // Even after a fresh failure, breaker should still be far from open.
    const failing = vi.fn().mockRejectedValue({ status: 500 });
    await expect(withRetry("reset-key", failing, { maxAttempts: 1 })).rejects.toBeDefined();
    // Total consecutive failures = 1 (the "ok" reset the counter), nowhere near 5.
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it("does not retry AbortError", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    const thunk = vi.fn().mockRejectedValue(err);
    await expect(withRetry("abort-key", thunk, { maxAttempts: 4, initialDelayMs: 1 })).rejects.toBe(err);
    expect(thunk).toHaveBeenCalledTimes(1);
  });
});
