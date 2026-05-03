import { describe, it, expect } from "vitest";
import { checkExternalUrl, isSafeExternalUrl, assertSafeExternalUrl, SsrfBlockedError } from "../ssrf";

describe("checkExternalUrl", () => {
  it("accepts plain https URLs", () => {
    expect(checkExternalUrl("https://example.com/foo")).toEqual({ ok: true });
    expect(checkExternalUrl("https://api.stripe.com/v1/charges")).toEqual({ ok: true });
  });

  it("rejects http (non-https) URLs", () => {
    const r = checkExternalUrl("http://example.com");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("protocol_not_allowed");
  });

  it("rejects file:// and ftp:// schemes", () => {
    expect(checkExternalUrl("file:///etc/passwd").ok).toBe(false);
    expect(checkExternalUrl("ftp://example.com").ok).toBe(false);
    expect(checkExternalUrl("gopher://example.com").ok).toBe(false);
  });

  it("rejects URLs with embedded credentials", () => {
    const r = checkExternalUrl("https://user:pass@example.com/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("embedded_credentials");
  });

  it("rejects localhost variants", () => {
    expect(checkExternalUrl("https://localhost/").ok).toBe(false);
    expect(checkExternalUrl("https://127.0.0.1/").ok).toBe(false);
    expect(checkExternalUrl("https://127.1.2.3/").ok).toBe(false);
  });

  it("rejects RFC 1918 private ranges", () => {
    expect(checkExternalUrl("https://10.0.0.1/").ok).toBe(false);
    expect(checkExternalUrl("https://172.16.0.1/").ok).toBe(false);
    expect(checkExternalUrl("https://192.168.1.1/").ok).toBe(false);
  });

  it("rejects AWS / GCP / Azure metadata endpoint (169.254.169.254)", () => {
    const r = checkExternalUrl("https://169.254.169.254/latest/meta-data/");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("blocked_ipv4");
  });

  it("rejects IPv6 loopback / link-local", () => {
    expect(checkExternalUrl("https://[::1]/").ok).toBe(false);
    expect(checkExternalUrl("https://[fe80::1]/").ok).toBe(false);
    expect(checkExternalUrl("https://[fd00::1]/").ok).toBe(false); // unique-local
  });

  it("rejects IPv4-mapped IPv6 pointing at private space", () => {
    expect(checkExternalUrl("https://[::ffff:127.0.0.1]/").ok).toBe(false);
    expect(checkExternalUrl("https://[::ffff:10.0.0.1]/").ok).toBe(false);
  });

  it("rejects internal TLDs (.local / .internal / .lan / .intranet)", () => {
    expect(checkExternalUrl("https://server.local/").ok).toBe(false);
    expect(checkExternalUrl("https://api.internal/").ok).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(checkExternalUrl("not-a-url").ok).toBe(false);
    expect(checkExternalUrl("").ok).toBe(false);
  });

  it("isSafeExternalUrl is a pure boolean", () => {
    expect(isSafeExternalUrl("https://example.com")).toBe(true);
    expect(isSafeExternalUrl("https://10.0.0.1")).toBe(false);
  });

  it("assertSafeExternalUrl throws on blocked URL", () => {
    expect(() => assertSafeExternalUrl("https://169.254.169.254/")).toThrow(SsrfBlockedError);
    expect(() => assertSafeExternalUrl("https://api.stripe.com/")).not.toThrow();
  });
});
