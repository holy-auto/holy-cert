/**
 * Ledra の売上ソース (documents / pos / stripe) を、provider 共通の
 * `LedraSalesEntry` に変換するマッパ群。
 *
 * 設計原則:
 *  - 1 ソース 1 関数。テストしやすさ優先。
 *  - 適格請求書 (インボイス) 対応のため、`tax_breakdown` があれば優先採用、
 *    無ければ単一税率 (`tax_rate`) で 1 行にまとめる。
 *  - 加盟店の入力ゼロを実現するため、partnerName が取れない場合は null を渡し、
 *    provider 側で fallback (default_partner) に流す。
 */

import type { LedraSalesEntry, SalesBreakdown } from "./types";

export interface DocumentRow {
  id: string;
  doc_type: string;
  doc_number: string;
  issued_at: string; // YYYY-MM-DD
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  tax_rate: number;
  tax_breakdown: TaxBreakdownRow[] | null;
  customer_id: string | null;
  customer_name?: string | null;
}

interface TaxBreakdownRow {
  rate: number;
  subtotal: number;
  tax: number;
}

/**
 * 「請求書 (paid)」を売上仕訳エントリに変換する。
 *
 * - 入金確定済み (status='paid') を前提に呼ぶ。draft/sent は呼び出し側で弾く。
 * - 入金口座は `bank` 固定 (請求書経由の入金は普通預金とみなす) — 加盟店設定で
 *   現金/Stripe等にオーバーライドしたい場合は将来 documents に payment_method
 *   を持たせて分岐する。
 */
export function documentToSalesEntry(doc: DocumentRow): LedraSalesEntry {
  const breakdown = normalizeBreakdown(doc.tax_breakdown, {
    subtotal: doc.subtotal,
    tax: doc.tax,
    rate: doc.tax_rate,
  });

  const partnerName = doc.customer_name?.trim() || undefined;
  const description = buildDescription({
    docNumber: doc.doc_number,
    customerName: partnerName,
  });

  return {
    sourceType: "document",
    sourceId: doc.id,
    issuedDate: doc.issued_at,
    partnerName,
    receiptAccount: "bank",
    breakdown,
    description,
    ledraRef: {
      docNumber: doc.doc_number,
      customerName: partnerName,
      customerId: doc.customer_id ?? undefined,
    },
  };
}

function normalizeBreakdown(
  raw: TaxBreakdownRow[] | null,
  fallback: { subtotal: number; tax: number; rate: number },
): SalesBreakdown[] {
  if (raw && raw.length > 0) {
    return raw
      .filter((b) => b.subtotal > 0 || b.tax > 0)
      .map((b) => ({
        rate: coerceRate(b.rate),
        subtotal: Math.round(b.subtotal),
        tax: Math.round(b.tax),
      }));
  }
  if (fallback.subtotal === 0 && fallback.tax === 0) return [];
  return [
    {
      rate: coerceRate(fallback.rate),
      subtotal: Math.round(fallback.subtotal),
      tax: Math.round(fallback.tax),
    },
  ];
}

function coerceRate(rate: number): 0 | 8 | 10 {
  if (rate === 8) return 8;
  if (rate === 0) return 0;
  return 10;
}

function buildDescription(opts: { docNumber: string; customerName?: string }): string {
  const customer = opts.customerName ? ` / ${opts.customerName}様` : "";
  return `Ledra 請求書 #${opts.docNumber}${customer}`;
}
