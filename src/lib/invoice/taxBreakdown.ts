/**
 * Qualified Invoice (適格請求書) tax-breakdown helpers.
 *
 * 日本のインボイス制度では、複数税率 (標準10% / 軽減8%) が同一書類に
 * 混在する場合、税率ごとに「対価の額」と「消費税額等」を区分して記載する
 * ことが義務付けられている (令和5年10月1日施行)。
 *
 * このモジュールは items_json から税率ごとの内訳 (`TaxBreakdown[]`) を
 * 構築し、合計の整合性検証やフォーマット用ヘルパーを提供する。
 */

export type TaxBreakdownEntry = {
  rate: number;
  subtotal: number;
  tax: number;
};

export type InvoiceLineItem = {
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
  /** 個別税率。未指定なら書類デフォルト (tax_rate) を使う */
  tax_rate?: number | null;
  /** 軽減税率対象品目フラグ。明示的に true の場合は ※ 表示 */
  is_reduced_rate?: boolean | null;
};

const DEFAULT_RATE = 10;

function lineRate(item: InvoiceLineItem, defaultRate: number): number {
  if (item.is_reduced_rate) return 8;
  if (typeof item.tax_rate === "number" && item.tax_rate >= 0) return item.tax_rate;
  return defaultRate;
}

function lineAmount(item: InvoiceLineItem): number {
  if (typeof item.amount === "number") return item.amount;
  const q = typeof item.quantity === "number" ? item.quantity : 0;
  const p = typeof item.unit_price === "number" ? item.unit_price : 0;
  return q * p;
}

/**
 * 行ごとの税率を集計して TaxBreakdown[] を返す。
 *
 * - 同一税率の行は合算
 * - 消費税額は税率ごとの subtotal × rate / 100 を四捨五入
 *   (インボイス制度では「税率ごとに端数処理」が要件)
 * - rate 降順 (10 → 8 → 0) でソートして UI 一貫性を担保
 */
export function buildTaxBreakdown(items: InvoiceLineItem[], defaultRate: number = DEFAULT_RATE): TaxBreakdownEntry[] {
  const byRate = new Map<number, number>();
  for (const it of items) {
    const rate = lineRate(it, defaultRate);
    const amt = lineAmount(it);
    byRate.set(rate, (byRate.get(rate) ?? 0) + amt);
  }
  return Array.from(byRate.entries())
    .map(([rate, subtotal]) => ({
      rate,
      subtotal,
      tax: Math.round((subtotal * rate) / 100),
    }))
    .sort((a, b) => b.rate - a.rate);
}

/** 税率の混在 (= 適格請求書として複数税率の表示が必須) かどうか */
export function hasMultipleRates(breakdown: TaxBreakdownEntry[]): boolean {
  return breakdown.length >= 2;
}

/** breakdown 全体の小計合計 */
export function totalSubtotal(breakdown: TaxBreakdownEntry[]): number {
  return breakdown.reduce((s, e) => s + e.subtotal, 0);
}

/** breakdown 全体の消費税合計 */
export function totalTax(breakdown: TaxBreakdownEntry[]): number {
  return breakdown.reduce((s, e) => s + e.tax, 0);
}

/**
 * 適格請求書発行事業者登録番号 (T+13桁) のフォーマット検証。
 * 国税庁の公式仕様: "T" 大文字 + 13 桁の数字。
 */
export function isValidRegistrationNumber(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^T\d{13}$/.test(value.trim());
}
