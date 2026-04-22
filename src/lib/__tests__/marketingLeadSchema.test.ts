import { describe, it, expect } from "vitest";
import { marketingLeadSchema } from "../validation/schemas";

describe("marketingLeadSchema", () => {
  const base = {
    source: "contact" as const,
    email: "user@example.com",
    consent: true as const,
  };

  it("accepts a minimal payload", () => {
    const result = marketingLeadSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("lowercases email", () => {
    const result = marketingLeadSchema.safeParse({ ...base, email: "USER@EXAMPLE.COM" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });

  it("rejects when consent is missing", () => {
    const result = marketingLeadSchema.safeParse({ source: "contact", email: "x@x.com" });
    expect(result.success).toBe(false);
  });

  it("rejects when consent is false", () => {
    const result = marketingLeadSchema.safeParse({ ...base, consent: false });
    expect(result.success).toBe(false);
  });

  it("rejects unknown source", () => {
    const result = marketingLeadSchema.safeParse({ ...base, source: "bogus" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = marketingLeadSchema.safeParse({
      ...base,
      source: "roi",
      name: "山田 太郎",
      company: "株式会社ABC",
      role: "代表",
      phone: "03-1234-5678",
      industry: "coating",
      locations: "3",
      timing: "3m",
      message: "ROI計算結果: 年間120万円削減",
      context: { monthly_certs: 100, hours_per_cert: 0.5 },
      utm_source: "google",
      utm_campaign: "launch",
    });
    expect(result.success).toBe(true);
  });

  it("rejects message beyond max length", () => {
    const result = marketingLeadSchema.safeParse({
      ...base,
      message: "a".repeat(4001),
    });
    expect(result.success).toBe(false);
  });
});
