import { describe, it, expect } from "vitest";
import { validateShakenshoData, extractFirstRegistrationYear, type ShakenshoData } from "./shakensho";

const currentYear = new Date().getFullYear();

describe("extractFirstRegistrationYear", () => {
  it("parses 4-digit western year prefix", () => {
    expect(extractFirstRegistrationYear("2022年3月")).toBe(2022);
    expect(extractFirstRegistrationYear("2023-01")).toBe(2023);
  });

  it("parses Reiwa era", () => {
    expect(extractFirstRegistrationYear("令和4年3月")).toBe(2022); // 2018 + 4
    expect(extractFirstRegistrationYear("令和1年")).toBe(2019);
  });

  it("parses Heisei era", () => {
    expect(extractFirstRegistrationYear("平成30年")).toBe(2018); // 1988 + 30
  });

  it("parses Showa era", () => {
    expect(extractFirstRegistrationYear("昭和60年")).toBe(1985); // 1925 + 60
  });

  it("returns null for undefined", () => {
    expect(extractFirstRegistrationYear(undefined)).toBeNull();
  });

  it("returns null for unrecognizable string", () => {
    expect(extractFirstRegistrationYear("不明")).toBeNull();
  });
});

describe("validateShakenshoData", () => {
  function valid(): ShakenshoData {
    return {
      vin: "MXPH15-0012345",
      first_registration: "令和4年3月",
      expiry_date: `${currentYear + 1}-06-15`,
      length_mm: 4500,
      width_mm: 1800,
      weight_kg: 1500,
    };
  }

  it("returns no warnings for valid data", () => {
    expect(validateShakenshoData(valid())).toHaveLength(0);
  });

  it("warns on malformed VIN", () => {
    const warnings = validateShakenshoData({ ...valid(), vin: "AB" }); // too short
    expect(warnings.some((w) => w.includes("車台番号"))).toBe(true);
  });

  it("accepts VIN with hyphens", () => {
    const warnings = validateShakenshoData({ ...valid(), vin: "MXPH15-0012345" });
    expect(warnings.some((w) => w.includes("車台番号"))).toBe(false);
  });

  it("warns when first_registration year is before 1950", () => {
    const warnings = validateShakenshoData({ ...valid(), first_registration: "1920年" });
    expect(warnings.some((w) => w.includes("初度登録年"))).toBe(true);
  });

  it("warns when first_registration year is far future", () => {
    const warnings = validateShakenshoData({ ...valid(), first_registration: `${currentYear + 5}年` });
    expect(warnings.some((w) => w.includes("初度登録年"))).toBe(true);
  });

  it("warns when expiry_date is more than 10 years in the past", () => {
    const warnings = validateShakenshoData({ ...valid(), expiry_date: `${currentYear - 11}-01-01` });
    expect(warnings.some((w) => w.includes("車検満了日"))).toBe(true);
  });

  it("warns when expiry_date is more than 5 years in the future", () => {
    const warnings = validateShakenshoData({ ...valid(), expiry_date: `${currentYear + 6}-01-01` });
    expect(warnings.some((w) => w.includes("車検満了日"))).toBe(true);
  });

  it("warns on length_mm < 2000", () => {
    const warnings = validateShakenshoData({ ...valid(), length_mm: 1500 });
    expect(warnings.some((w) => w.includes("車長が短すぎ"))).toBe(true);
  });

  it("warns on width_mm < 1000", () => {
    const warnings = validateShakenshoData({ ...valid(), width_mm: 800 });
    expect(warnings.some((w) => w.includes("車幅が狭すぎ"))).toBe(true);
  });

  it("warns when length < width", () => {
    const warnings = validateShakenshoData({ ...valid(), length_mm: 1700, width_mm: 1800 });
    expect(warnings.some((w) => w.includes("車長") && w.includes("車幅"))).toBe(true);
  });

  it("warns on weight_kg < 400", () => {
    const warnings = validateShakenshoData({ ...valid(), weight_kg: 300 });
    expect(warnings.some((w) => w.includes("車両重量"))).toBe(true);
  });

  it("warns on weight_kg > 25000", () => {
    const warnings = validateShakenshoData({ ...valid(), weight_kg: 30000 });
    expect(warnings.some((w) => w.includes("車両重量"))).toBe(true);
  });

  it("returns no warnings for empty data", () => {
    expect(validateShakenshoData({})).toHaveLength(0);
  });
});
