/* ------------------------------------------------------------------ */
/*  Shop Products & Orders — 型定義                                    */
/* ------------------------------------------------------------------ */

export type ShopProductCategory =
  | "nfc_tag"
  | "certificate_template"
  | "sticker"
  | "sign"
  | "banner"
  | "other";

export const SHOP_CATEGORY_LABELS: Record<ShopProductCategory, string> = {
  nfc_tag: "NFCタグ",
  certificate_template: "ブランド証明書",
  sticker: "ステッカー",
  sign: "看板",
  banner: "のぼり",
  other: "その他",
};

export const SHOP_CATEGORY_ALL = Object.keys(SHOP_CATEGORY_LABELS) as ShopProductCategory[];

export type ShopOrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export const SHOP_ORDER_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending: "未払い",
  paid: "支払済み",
  processing: "処理中",
  shipped: "発送済み",
  completed: "完了",
  cancelled: "キャンセル",
};

export type ShopPaymentMethod = "stripe" | "invoice";

export const SHOP_PAYMENT_METHOD_LABELS: Record<ShopPaymentMethod, string> = {
  stripe: "カード決済",
  invoice: "請求書払い",
};

/* ── DB row types ── */

export interface ShopProductRow {
  id: string;
  name: string;
  description: string | null;
  category: ShopProductCategory;
  price: number;
  tax_rate: number;
  unit: string;
  min_quantity: number;
  image_path: string | null;
  is_active: boolean;
  sort_order: number;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderRow {
  id: string;
  tenant_id: string;
  order_number: string;
  status: ShopOrderStatus;
  payment_method: ShopPaymentMethod;
  subtotal: number;
  tax: number;
  total: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  note: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
  meta: Record<string, unknown>;
  created_at: string;
}

/* ── Cart helpers ── */

export interface CartItem {
  product: ShopProductRow;
  quantity: number;
}

export function calcItemAmount(price: number, quantity: number): number {
  return price * quantity;
}

export function calcItemTax(price: number, quantity: number, taxRate: number): number {
  return Math.floor(price * quantity * taxRate);
}

export function calcCartTotals(items: CartItem[]) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const amt = calcItemAmount(item.product.price, item.quantity);
    subtotal += amt;
    tax += calcItemTax(item.product.price, item.quantity, item.product.tax_rate);
  }
  return { subtotal, tax, total: subtotal + tax };
}
