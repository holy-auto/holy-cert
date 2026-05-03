import { describe, it, expect } from "vitest";
import { computeHmacHex, computeHmacBase64, verifyHmacSignature, verifyTimestampedHmac, safeEqual } from "../hmac";

const SECRET = "super-secret-for-tests";

describe("computeHmac", () => {
  it("produces a stable hex digest", () => {
    const a = computeHmacHex("hello", SECRET);
    const b = computeHmacHex("hello", SECRET);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when payload changes", () => {
    expect(computeHmacHex("a", SECRET)).not.toBe(computeHmacHex("b", SECRET));
  });

  it("supports base64 output", () => {
    const out = computeHmacBase64("hello", SECRET);
    expect(out).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

describe("safeEqual", () => {
  it("returns true for identical strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });
  it("returns false for different lengths without crashing", () => {
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("returns false for same-length differing strings", () => {
    expect(safeEqual("abcd", "abce")).toBe(false);
  });
});

describe("verifyHmacSignature", () => {
  it("accepts a correct hex signature", () => {
    const sig = computeHmacHex("payload-1", SECRET);
    expect(verifyHmacSignature("payload-1", sig, SECRET)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const sig = computeHmacHex("payload-1", SECRET);
    expect(verifyHmacSignature("payload-2", sig, SECRET)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    expect(verifyHmacSignature("payload-1", "deadbeef", SECRET)).toBe(false);
  });

  it("rejects empty inputs", () => {
    expect(verifyHmacSignature("payload", "", SECRET)).toBe(false);
    expect(verifyHmacSignature("payload", "abc", "")).toBe(false);
  });

  it("supports base64 encoding option", () => {
    const sig = computeHmacBase64("payload-3", SECRET);
    expect(verifyHmacSignature("payload-3", sig, SECRET, { encoding: "base64" })).toBe(true);
  });
});

describe("verifyTimestampedHmac", () => {
  it("accepts a fresh timestamp + correct signature", () => {
    const ts = Math.floor(Date.now() / 1000);
    const body = '{"event":"x"}';
    const signature = computeHmacHex(`${ts}.${body}`, SECRET);
    const r = verifyTimestampedHmac({ rawBody: body, timestamp: ts, signature, secret: SECRET });
    expect(r.ok).toBe(true);
  });

  it("rejects out-of-tolerance timestamps", () => {
    const ts = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const body = '{"event":"x"}';
    const signature = computeHmacHex(`${ts}.${body}`, SECRET);
    const r = verifyTimestampedHmac({ rawBody: body, timestamp: ts, signature, secret: SECRET });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("timestamp_out_of_tolerance");
  });

  it("rejects mismatched signature even with fresh timestamp", () => {
    const ts = Math.floor(Date.now() / 1000);
    const r = verifyTimestampedHmac({
      rawBody: '{"event":"x"}',
      timestamp: ts,
      signature: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      secret: SECRET,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("signature_mismatch");
  });

  it("handles millisecond timestamps", () => {
    const ts = Date.now(); // ms
    const body = "ping";
    const signature = computeHmacHex(`${Math.floor(ts / 1000)}.${body}`, SECRET);
    const r = verifyTimestampedHmac({ rawBody: body, timestamp: ts, signature, secret: SECRET });
    expect(r.ok).toBe(true);
  });
});
