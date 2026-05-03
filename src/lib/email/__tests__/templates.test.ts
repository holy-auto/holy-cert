import { describe, it, expect, vi } from "vitest";
import { applyTemplate, renderEmailTemplate, listBuiltinTopics } from "@/lib/email/templates";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => ({}) },
}));

describe("applyTemplate", () => {
  it("substitutes {{var}} with the value", () => {
    expect(applyTemplate("Hi {{name}}", { name: "Alice" })).toBe("Hi Alice");
  });
  it("treats undefined as empty string", () => {
    expect(applyTemplate("Hello {{nobody}}", {})).toBe("Hello ");
  });
  it("supports multiple substitutions", () => {
    expect(applyTemplate("{{a}}-{{b}}-{{a}}", { a: "x", b: "y" })).toBe("x-y-x");
  });
  it("ignores unknown placeholders if value missing", () => {
    expect(applyTemplate("price: {{n}}", { n: 100 })).toBe("price: 100");
  });
});

function fakeDb(row: unknown) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: row, error: null });
        },
      };
    },
  } as unknown as Parameters<typeof renderEmailTemplate>[0];
}

describe("renderEmailTemplate", () => {
  it("falls back to built-in default when no tenant template exists", async () => {
    const r = await renderEmailTemplate(fakeDb(null), "t1", "booking_confirmation", {
      customer_name: "山田",
      tenant_name: "デモ加盟店",
      scheduled_at: "2026-05-10 10:00",
    });
    expect(r.subject).toContain("デモ加盟店");
    expect(r.body_html).toContain("山田");
    expect(r.body_html).toContain("2026-05-10 10:00");
  });

  it("uses tenant override when present", async () => {
    const r = await renderEmailTemplate(
      fakeDb({
        subject: "[{{tenant_name}}] 予約 OK",
        body_html: "<b>{{customer_name}}</b>",
        body_text: null,
        is_active: true,
      }),
      "t1",
      "booking_confirmation",
      { tenant_name: "Demo", customer_name: "Alice" },
    );
    expect(r.subject).toBe("[Demo] 予約 OK");
    expect(r.body_html).toBe("<b>Alice</b>");
    // body_text falls back to HTML stripped if null in DB.
    expect(r.body_text).toBe("Alice");
  });

  it("rejects unknown topic if no built-in default", async () => {
    await expect(renderEmailTemplate(fakeDb(null), "t1", "totally-bogus", {})).rejects.toThrow(/unknown_email_topic/);
  });

  it("listBuiltinTopics enumerates the expected set", () => {
    const topics = listBuiltinTopics();
    expect(topics).toContain("booking_confirmation");
    expect(topics).toContain("certificate_issued");
    expect(topics).toContain("customer_data_export");
  });
});
