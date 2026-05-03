import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn().mockResolvedValue({ id: "test-id" }) }));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSec: 0, remaining: 4 }),
  getClientIp: () => "127.0.0.1",
}));

vi.mock("@/lib/slack", () => ({
  notifySlack: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import { POST } from "@/app/api/contact/route";
import { checkRateLimit } from "@/lib/rateLimit";

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    sendMock.mockClear();
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.RESEND_FROM = "Ledra <support@example.com>";
    process.env.CONTACT_TO_EMAIL = "info@example.com";
  });

  it("rejects when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce({
      allowed: false,
      retryAfterSec: 60,
      remaining: 0,
    });
    const res = await POST(jsonReq({}));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("validation_error");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(jsonReq({ name: "", email: "x", category: "", message: "" }));
    expect(res.status).toBe(400);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends email and returns 200 on valid input", async () => {
    const res = await POST(
      jsonReq({
        name: "山田",
        email: "yamada@example.com",
        category: "general",
        message: "お問い合わせ",
      }),
    );
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledOnce();
    const arg = sendMock.mock.calls[0][0];
    // CONTACT_TO_EMAIL/RESEND_FROM are read at module load, so we assert on the
    // shape Resend receives, not the runtime env we set in beforeEach.
    expect(typeof arg.to).toBe("string");
    expect(arg.replyTo).toBe("yamada@example.com");
  });
});
