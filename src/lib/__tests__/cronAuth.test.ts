import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import { verifyCronRequest } from "@/lib/cronAuth";

const SECRET = "unit-test-cron-secret";

describe("verifyCronRequest", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  function makeReq(headers: Record<string, string>, url = "https://app/api/cron/billing"): Request {
    return new Request(url, { headers });
  }

  it("rejects when CRON_SECRET is not configured", () => {
    delete process.env.CRON_SECRET;
    const res = verifyCronRequest(makeReq({}));
    expect(res.authorized).toBe(false);
    expect(res.error).toMatch(/CRON_SECRET/);
  });

  it("accepts a Vercel cron signature computed over the URL pathname", () => {
    const url = "https://app/api/cron/billing";
    const sig = crypto.createHmac("sha256", SECRET).update("/api/cron/billing").digest("hex");
    const res = verifyCronRequest(makeReq({ "x-vercel-cron-signature": sig }, url));
    expect(res.authorized).toBe(true);
  });

  it("rejects an invalid Vercel cron signature without falling back to bearer", () => {
    // The bearer is correct, but the Vercel signature is wrong; presence of
    // the Vercel header MUST short-circuit (defense in depth: don't let an
    // attacker downgrade to bearer auth by sending a junk signature).
    const res = verifyCronRequest(
      makeReq({
        "x-vercel-cron-signature": "deadbeef",
        authorization: `Bearer ${SECRET}`,
      }),
    );
    expect(res.authorized).toBe(false);
  });

  it("accepts a valid Bearer token", () => {
    const res = verifyCronRequest(makeReq({ authorization: `Bearer ${SECRET}` }));
    expect(res.authorized).toBe(true);
  });

  it("rejects a missing or wrong Bearer", () => {
    expect(verifyCronRequest(makeReq({})).authorized).toBe(false);
    expect(verifyCronRequest(makeReq({ authorization: "Bearer wrong" })).authorized).toBe(false);
  });
});
