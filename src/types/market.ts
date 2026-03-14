// ============================================================
// BtoB 中古車在庫共有プラットフォーム（Market）型定義
// ============================================================

export type DealerStatus = "pending" | "approved" | "suspended";
export type ListingStatus = "active" | "reserved" | "sold" | "hidden";
export type InquiryStatus = "open" | "replied" | "closed" | "deal";
export type DealStatus = "negotiating" | "agreed" | "completed" | "cancelled";
export type DealerUserRole = "admin" | "staff";

// ──────────────────────────────────────────
// Dealer（業者）
// ──────────────────────────────────────────
export interface Dealer {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  prefecture: string | null;
  status: DealerStatus;
  invite_code: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealerUser {
  id: string;
  dealer_id: string;
  user_id: string;
  role: DealerUserRole;
  created_at: string;
}

// ──────────────────────────────────────────
// Inventory Listing（在庫掲載）
// ──────────────────────────────────────────
export interface InventoryListing {
  id: string;
  dealer_id: string;
  public_id: string;
  status: ListingStatus;

  // 車両情報
  make: string;
  model: string;
  grade: string | null;
  year: number | null;
  mileage: number | null; // km
  color: string | null;
  body_type: string | null;
  fuel_type: string | null;
  transmission: string | null;

  // 価格
  price: number | null; // 円

  // 車検・修復歴
  has_vehicle_inspection: boolean;
  inspection_expiry: string | null; // ISO date
  has_repair_history: boolean;
  repair_history_notes: string | null;

  // 説明
  description: string | null;
  notes: string | null; // 内部メモ

  created_at: string;
  updated_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

// ──────────────────────────────────────────
// Inquiry（問い合わせ）
// ──────────────────────────────────────────
export interface ListingInquiry {
  id: string;
  listing_id: string;
  from_dealer_id: string;
  to_dealer_id: string;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface InquiryMessage {
  id: string;
  inquiry_id: string;
  sender_dealer_id: string;
  message: string;
  created_at: string;
}

// ──────────────────────────────────────────
// Deal（商談）
// ──────────────────────────────────────────
export interface Deal {
  id: string;
  listing_id: string;
  inquiry_id: string | null;
  buyer_dealer_id: string;
  seller_dealer_id: string;
  agreed_price: number | null;
  status: DealStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────
// Joined / View types（結合型）
// ──────────────────────────────────────────
export interface ListingWithDealer extends InventoryListing {
  dealer: Pick<Dealer, "id" | "company_name" | "prefecture">;
  images: ListingImage[];
}

export interface InquiryWithDetails extends ListingInquiry {
  listing: Pick<InventoryListing, "id" | "public_id" | "make" | "model" | "year" | "price">;
  from_dealer: Pick<Dealer, "id" | "company_name">;
  to_dealer: Pick<Dealer, "id" | "company_name">;
  messages: InquiryMessage[];
}

export interface DealWithDetails extends Deal {
  listing: Pick<InventoryListing, "id" | "public_id" | "make" | "model" | "year">;
  buyer: Pick<Dealer, "id" | "company_name">;
  seller: Pick<Dealer, "id" | "company_name">;
}

// ──────────────────────────────────────────
// API Request / Response
// ──────────────────────────────────────────
export interface CreateListingInput {
  make: string;
  model: string;
  grade?: string;
  year?: number;
  mileage?: number;
  color?: string;
  body_type?: string;
  fuel_type?: string;
  transmission?: string;
  price?: number;
  has_vehicle_inspection?: boolean;
  inspection_expiry?: string;
  has_repair_history?: boolean;
  repair_history_notes?: string;
  description?: string;
  notes?: string;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  status?: ListingStatus;
}

export interface CreateInquiryInput {
  listing_id: string;
  message: string;
}

export interface ReplyInquiryInput {
  message: string;
}

export interface CreateDealInput {
  listing_id: string;
  inquiry_id?: string;
  agreed_price?: number;
  notes?: string;
}

export interface ListingSearchParams {
  q?: string;
  prefecture?: string;
  make?: string;
  body_type?: string;
  fuel_type?: string;
  transmission?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  mileage_max?: number;
  has_vehicle_inspection?: boolean;
  has_repair_history?: boolean;
  status?: ListingStatus;
  page?: number;
  limit?: number;
}

// ──────────────────────────────────────────
// セッション型
// ──────────────────────────────────────────
export interface DealerSession {
  dealer: Dealer;
  dealerUser: DealerUser;
}
