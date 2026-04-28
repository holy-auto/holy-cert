import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "../parseBody";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const schema = z.object({
  title: z.string().min(1, "title required"),
  count: z.number().int().min(0),
});

function jsonReq(body: unknown): Request {
  return new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("parseJsonBody", () => {
  it("returns parsed data on valid input", async () => {
    const req = jsonReq({ title: "hi", count: 3 });
    const res = await parseJsonBody(req, schema);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual({ title: "hi", count: 3 });
    }
  });

  it("returns 400 validation_error response on schema failure", async () => {
    const req = jsonReq({ title: "", count: -1 });
    const res = await parseJsonBody(req, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(400);
      const body = await res.response.json();
      expect(body.error).toBe("validation_error");
      expect(Array.isArray(body.issues)).toBe(true);
      expect(body.issues.length).toBeGreaterThan(0);
    }
  });

  it("returns 400 when body is not valid JSON", async () => {
    const req = new Request("http://localhost/test", {
      method: "POST",
      body: "not json",
      headers: { "content-type": "application/json" },
    });
    const res = await parseJsonBody(req, schema);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.response.status).toBe(400);
      const body = await res.response.json();
      expect(body.error).toBe("validation_error");
    }
  });
});
