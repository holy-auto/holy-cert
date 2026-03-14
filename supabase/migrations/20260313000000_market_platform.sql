-- ============================================================
-- BtoB 中古車在庫共有プラットフォーム マイグレーション
-- ============================================================

-- ──────────────────────────────────────────
-- dealers テーブル
-- ──────────────────────────────────────────
CREATE TABLE dealers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name  TEXT NOT NULL,
  contact_name  TEXT,
  phone         TEXT,
  address       TEXT,
  prefecture    TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'suspended')),
  invite_code   TEXT UNIQUE,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ──────────────────────────────────────────
-- dealer_users テーブル（Supabase Auth との紐付け）
-- ──────────────────────────────────────────
CREATE TABLE dealer_users (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id  UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (dealer_id, user_id)
);

-- ──────────────────────────────────────────
-- inventory_listings テーブル
-- ──────────────────────────────────────────
CREATE TABLE inventory_listings (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id   UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  public_id   TEXT UNIQUE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'reserved', 'sold', 'hidden')),

  -- 車両情報
  make        TEXT NOT NULL,
  model       TEXT NOT NULL,
  grade       TEXT,
  year        INTEGER CHECK (year >= 1900 AND year <= 2100),
  mileage     INTEGER CHECK (mileage >= 0),
  color       TEXT,
  body_type   TEXT,
  fuel_type   TEXT,
  transmission TEXT,

  -- 価格（円）
  price       INTEGER CHECK (price >= 0),

  -- 車検・修復歴
  has_vehicle_inspection BOOLEAN NOT NULL DEFAULT false,
  inspection_expiry      DATE,
  has_repair_history     BOOLEAN NOT NULL DEFAULT false,
  repair_history_notes   TEXT,

  -- 説明
  description TEXT,
  notes       TEXT, -- 内部メモ（他業者には非表示）

  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ──────────────────────────────────────────
-- listing_images テーブル
-- ──────────────────────────────────────────
CREATE TABLE listing_images (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   UUID NOT NULL REFERENCES inventory_listings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ──────────────────────────────────────────
-- listing_inquiries テーブル
-- ──────────────────────────────────────────
CREATE TABLE listing_inquiries (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id     UUID NOT NULL REFERENCES inventory_listings(id) ON DELETE CASCADE,
  from_dealer_id UUID NOT NULL REFERENCES dealers(id),
  to_dealer_id   UUID NOT NULL REFERENCES dealers(id),
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'replied', 'closed', 'deal')),
  created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- 同じ掲載に対して同じ業者からは一度だけ問い合わせ可能
  UNIQUE (listing_id, from_dealer_id)
);

-- ──────────────────────────────────────────
-- inquiry_messages テーブル
-- ──────────────────────────────────────────
CREATE TABLE inquiry_messages (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id       UUID NOT NULL REFERENCES listing_inquiries(id) ON DELETE CASCADE,
  sender_dealer_id UUID NOT NULL REFERENCES dealers(id),
  message          TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ──────────────────────────────────────────
-- deals テーブル（商談）
-- ──────────────────────────────────────────
CREATE TABLE deals (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id       UUID NOT NULL REFERENCES inventory_listings(id),
  inquiry_id       UUID REFERENCES listing_inquiries(id),
  buyer_dealer_id  UUID NOT NULL REFERENCES dealers(id),
  seller_dealer_id UUID NOT NULL REFERENCES dealers(id),
  agreed_price     INTEGER CHECK (agreed_price >= 0),
  status           TEXT NOT NULL DEFAULT 'negotiating'
                     CHECK (status IN ('negotiating', 'agreed', 'completed', 'cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ──────────────────────────────────────────
-- インデックス
-- ──────────────────────────────────────────
CREATE INDEX idx_inventory_listings_dealer_id ON inventory_listings(dealer_id);
CREATE INDEX idx_inventory_listings_status ON inventory_listings(status);
CREATE INDEX idx_inventory_listings_make ON inventory_listings(make);
CREATE INDEX idx_inventory_listings_year ON inventory_listings(year);
CREATE INDEX idx_inventory_listings_price ON inventory_listings(price);
CREATE INDEX idx_inventory_listings_created_at ON inventory_listings(created_at DESC);

CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id, sort_order);
CREATE INDEX idx_listing_inquiries_from_dealer ON listing_inquiries(from_dealer_id);
CREATE INDEX idx_listing_inquiries_to_dealer ON listing_inquiries(to_dealer_id);
CREATE INDEX idx_inquiry_messages_inquiry_id ON inquiry_messages(inquiry_id, created_at);
CREATE INDEX idx_deals_buyer ON deals(buyer_dealer_id);
CREATE INDEX idx_deals_seller ON deals(seller_dealer_id);
CREATE INDEX idx_deals_listing ON deals(listing_id);
CREATE INDEX idx_dealer_users_user_id ON dealer_users(user_id);

-- ──────────────────────────────────────────
-- updated_at 自動更新トリガー
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER dealers_updated_at
  BEFORE UPDATE ON dealers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER inventory_listings_updated_at
  BEFORE UPDATE ON inventory_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER listing_inquiries_updated_at
  BEFORE UPDATE ON listing_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────
-- RLS（Row Level Security）ポリシー
-- ──────────────────────────────────────────

-- dealers: 認証済みユーザーは自分が紐付くdealerのみ参照可
ALTER TABLE dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE dealer_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiry_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- service_role は全テーブルへのアクセスを許可（API server-side）
-- 各テーブルのポリシーはアプリ側でservice_roleを使って制御
