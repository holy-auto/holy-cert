import { describe, expect, it } from "vitest";
import { documentToSalesEntry, type DocumentRow } from "../mapper";

const baseDoc: DocumentRow = {
  id: "00000000-0000-4000-8000-000000000001",
  doc_type: "invoice",
  doc_number: "INV-2026-001",
  issued_at: "2026-05-01",
  status: "paid",
  subtotal: 10_000,
  tax: 1_000,
  total: 11_000,
  tax_rate: 10,
  tax_breakdown: null,
  customer_id: "00000000-0000-4000-8000-000000000010",
  customer_name: "山田太郎",
};

describe("documentToSalesEntry", () => {
  it("単一税率の請求書を 1 行の breakdown に変換する", () => {
    const entry = documentToSalesEntry(baseDoc);
    expect(entry.sourceType).toBe("document");
    expect(entry.sourceId).toBe(baseDoc.id);
    expect(entry.issuedDate).toBe("2026-05-01");
    expect(entry.partnerName).toBe("山田太郎");
    expect(entry.receiptAccount).toBe("bank");
    expect(entry.breakdown).toEqual([{ rate: 10, subtotal: 10_000, tax: 1_000 }]);
    expect(entry.description).toContain("INV-2026-001");
    expect(entry.description).toContain("山田太郎");
    expect(entry.ledraRef.docNumber).toBe("INV-2026-001");
  });

  it("適格請求書 (税率混在) は税率ごとに breakdown を分割する", () => {
    const doc: DocumentRow = {
      ...baseDoc,
      tax_rate: 10, // 主税率は 10 だが breakdown に 8% も混在
      subtotal: 16_000,
      tax: 1_480,
      total: 17_480,
      tax_breakdown: [
        { rate: 10, subtotal: 10_000, tax: 1_000 },
        { rate: 8, subtotal: 6_000, tax: 480 },
      ],
    };
    const entry = documentToSalesEntry(doc);
    expect(entry.breakdown).toHaveLength(2);
    expect(entry.breakdown[0]).toEqual({ rate: 10, subtotal: 10_000, tax: 1_000 });
    expect(entry.breakdown[1]).toEqual({ rate: 8, subtotal: 6_000, tax: 480 });
  });

  it("breakdown 内の 0 円行を除外する", () => {
    const doc: DocumentRow = {
      ...baseDoc,
      tax_breakdown: [
        { rate: 10, subtotal: 10_000, tax: 1_000 },
        { rate: 8, subtotal: 0, tax: 0 },
      ],
    };
    const entry = documentToSalesEntry(doc);
    expect(entry.breakdown).toHaveLength(1);
    expect(entry.breakdown[0].rate).toBe(10);
  });

  it("顧客名が無い (飛び込み案件) 場合は partnerName を未指定にする", () => {
    const doc: DocumentRow = { ...baseDoc, customer_id: null, customer_name: null };
    const entry = documentToSalesEntry(doc);
    expect(entry.partnerName).toBeUndefined();
    expect(entry.ledraRef.customerName).toBeUndefined();
    expect(entry.ledraRef.customerId).toBeUndefined();
  });

  it("税率が 0/8/10 以外の場合は 10% 扱いに丸める", () => {
    const doc: DocumentRow = { ...baseDoc, tax_rate: 5, tax_breakdown: null };
    const entry = documentToSalesEntry(doc);
    expect(entry.breakdown[0].rate).toBe(10);
  });

  it("subtotal/tax が 0 の場合 breakdown を空にする", () => {
    const doc: DocumentRow = {
      ...baseDoc,
      subtotal: 0,
      tax: 0,
      total: 0,
      tax_breakdown: null,
    };
    const entry = documentToSalesEntry(doc);
    expect(entry.breakdown).toHaveLength(0);
  });
});
