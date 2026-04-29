import { describe, it, expect } from "vitest";
import {
  buildTaxBreakdown,
  hasMultipleRates,
  totalSubtotal,
  totalTax,
  isValidRegistrationNumber,
} from "../taxBreakdown";

describe("buildTaxBreakdown", () => {
  it("groups single-rate items into one entry", () => {
    const out = buildTaxBreakdown(
      [
        { amount: 1000, tax_rate: 10 },
        { amount: 2000, tax_rate: 10 },
      ],
      10,
    );
    expect(out).toEqual([{ rate: 10, subtotal: 3000, tax: 300 }]);
  });

  it("separates 10% and 8% items", () => {
    const out = buildTaxBreakdown(
      [
        { amount: 10000, tax_rate: 10 },
        { amount: 5000, tax_rate: 8 },
        { amount: 1000, tax_rate: 8 },
      ],
      10,
    );
    expect(out).toEqual([
      { rate: 10, subtotal: 10000, tax: 1000 },
      { rate: 8, subtotal: 6000, tax: 480 },
    ]);
  });

  it("treats is_reduced_rate=true as 8% override", () => {
    const out = buildTaxBreakdown([{ amount: 5000, is_reduced_rate: true }], 10);
    expect(out).toEqual([{ rate: 8, subtotal: 5000, tax: 400 }]);
  });

  it("falls back to default rate when item has no rate", () => {
    const out = buildTaxBreakdown([{ amount: 100 }], 10);
    expect(out).toEqual([{ rate: 10, subtotal: 100, tax: 10 }]);
  });

  it("rounds tax per rate (consistent with インボイス制度 端数処理)", () => {
    // 1234 * 10% = 123.4 → 123
    const out = buildTaxBreakdown([{ amount: 1234, tax_rate: 10 }], 10);
    expect(out[0].tax).toBe(123);
  });

  it("computes amount from quantity * unit_price when amount missing", () => {
    const out = buildTaxBreakdown([{ quantity: 3, unit_price: 1000, tax_rate: 10 }], 10);
    expect(out[0].subtotal).toBe(3000);
  });
});

describe("hasMultipleRates", () => {
  it("returns true when 2+ rates", () => {
    expect(
      hasMultipleRates([
        { rate: 10, subtotal: 100, tax: 10 },
        { rate: 8, subtotal: 100, tax: 8 },
      ]),
    ).toBe(true);
  });
  it("returns false for single rate", () => {
    expect(hasMultipleRates([{ rate: 10, subtotal: 100, tax: 10 }])).toBe(false);
  });
});

describe("totalSubtotal / totalTax", () => {
  it("sums across rates", () => {
    const breakdown = [
      { rate: 10, subtotal: 10000, tax: 1000 },
      { rate: 8, subtotal: 6000, tax: 480 },
    ];
    expect(totalSubtotal(breakdown)).toBe(16000);
    expect(totalTax(breakdown)).toBe(1480);
  });
});

describe("isValidRegistrationNumber", () => {
  it("accepts T + 13 digits", () => {
    expect(isValidRegistrationNumber("T1234567890123")).toBe(true);
  });
  it("rejects lowercase t", () => {
    expect(isValidRegistrationNumber("t1234567890123")).toBe(false);
  });
  it("rejects wrong length", () => {
    expect(isValidRegistrationNumber("T123")).toBe(false);
    expect(isValidRegistrationNumber("T12345678901234")).toBe(false);
  });
  it("rejects null/empty", () => {
    expect(isValidRegistrationNumber(null)).toBe(false);
    expect(isValidRegistrationNumber("")).toBe(false);
  });
  it("trims surrounding whitespace", () => {
    expect(isValidRegistrationNumber("  T1234567890123  ")).toBe(true);
  });
});
