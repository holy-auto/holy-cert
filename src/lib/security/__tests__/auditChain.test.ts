import { describe, it, expect } from "vitest";
import { canonicalJson, computeAuditHash, verifyAuditChain } from "../auditChain";

describe("canonicalJson", () => {
  it("sorts object keys deterministically", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("ignores undefined fields", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
  });

  it("handles nested arrays + objects", () => {
    expect(canonicalJson({ a: [1, { c: 3, b: 2 }] })).toBe('{"a":[1,{"b":2,"c":3}]}');
  });

  it("handles null / boolean / number", () => {
    expect(canonicalJson(null)).toBe("null");
    expect(canonicalJson(true)).toBe("true");
    expect(canonicalJson(42)).toBe("42");
    expect(canonicalJson(NaN)).toBe("null"); // non-finite → null (JSON 互換)
  });
});

describe("computeAuditHash", () => {
  it("produces stable 64-char hex digests", () => {
    const h = computeAuditHash(null, { a: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes when prev hash changes", () => {
    const a = computeAuditHash("prev1", { a: 1 });
    const b = computeAuditHash("prev2", { a: 1 });
    expect(a).not.toBe(b);
  });

  it("changes when record changes", () => {
    const a = computeAuditHash("prev", { a: 1 });
    const b = computeAuditHash("prev", { a: 2 });
    expect(a).not.toBe(b);
  });
});

describe("verifyAuditChain", () => {
  function build(records: Record<string, unknown>[]) {
    let prev: string | null = null;
    return records.map((rec) => {
      const hash = computeAuditHash(prev, rec);
      const entry = { prev_hash: prev, hash, record: rec };
      prev = hash;
      return entry;
    });
  }

  it("verifies a valid chain", () => {
    const chain = build([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(verifyAuditChain(chain)).toEqual({ ok: true });
  });

  it("detects tampering with the middle record", () => {
    const chain = build([{ a: 1 }, { a: 2 }, { a: 3 }]);
    chain[1].record = { a: 999 };
    const r = verifyAuditChain(chain);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.brokenAt).toBe(1);
  });

  it("detects tampering with prev_hash linkage", () => {
    const chain = build([{ a: 1 }, { a: 2 }]);
    chain[1].prev_hash = "deadbeef";
    const r = verifyAuditChain(chain);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.brokenAt).toBe(1);
  });

  it("verifies an empty chain", () => {
    expect(verifyAuditChain([])).toEqual({ ok: true });
  });
});
