-- ================================================================
-- 価格収集・業界ニュース・受発注 機能追加
-- ================================================================

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 1. shop_price_submissions: 施工価格の収集
-- ================================================================
CREATE TABLE shop_price_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id        UUID        NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  service_category TEXT        NOT NULL CHECK (service_category IN ('window_film','body_glass_coat','ppf','wrap','other')),
  service_name     TEXT        NOT NULL,
  price_min        INTEGER     CHECK (price_min >= 0),
  price_max        INTEGER     CHECK (price_max >= 0),
  price_typical    INTEGER     CHECK (price_typical >= 0),
  unit             TEXT        NOT NULL DEFAULT 'per_vehicle' CHECK (unit IN ('per_vehicle','per_sqm')),
  notes            TEXT,
  prefecture       TEXT        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_sub_dealer     ON shop_price_submissions(dealer_id);
CREATE INDEX idx_price_sub_category   ON shop_price_submissions(service_category);
CREATE INDEX idx_price_sub_prefecture ON shop_price_submissions(prefecture);

CREATE TRIGGER trg_price_sub_updated_at
  BEFORE UPDATE ON shop_price_submissions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- 2. industry_news: 業界ニュース
-- ================================================================
CREATE TABLE industry_news (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id    TEXT        UNIQUE NOT NULL,
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'general' CHECK (category IN ('general','product','regulation','market','event')),
  source_url   TEXT,
  is_published BOOLEAN     NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_published ON industry_news(is_published, published_at DESC);

CREATE TRIGGER trg_news_updated_at
  BEFORE UPDATE ON industry_news
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- 3. job_orders: 仕事の受発注
-- ================================================================
CREATE TABLE job_orders (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id          TEXT        UNIQUE NOT NULL,
  poster_dealer_id   UUID        NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  title              TEXT        NOT NULL,
  description        TEXT        NOT NULL,
  service_category   TEXT        NOT NULL CHECK (service_category IN ('window_film','body_glass_coat','ppf','wrap','other')),
  prefecture         TEXT        NOT NULL,
  city               TEXT,
  budget_min         INTEGER     CHECK (budget_min >= 0),
  budget_max         INTEGER     CHECK (budget_max >= 0),
  desired_date       DATE,
  deadline           DATE,
  status             TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','completed','cancelled')),
  assigned_dealer_id UUID        REFERENCES dealers(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_orders_poster     ON job_orders(poster_dealer_id);
CREATE INDEX idx_job_orders_status     ON job_orders(status);
CREATE INDEX idx_job_orders_prefecture ON job_orders(prefecture);
CREATE INDEX idx_job_orders_category   ON job_orders(service_category);

CREATE TRIGGER trg_job_orders_updated_at
  BEFORE UPDATE ON job_orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ================================================================
-- 4. job_bids: 案件への入札
-- ================================================================
CREATE TABLE job_bids (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id     UUID        NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  bidder_dealer_id UUID        NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  bid_price        INTEGER     CHECK (bid_price >= 0),
  message          TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_order_id, bidder_dealer_id)
);

CREATE INDEX idx_job_bids_order  ON job_bids(job_order_id);
CREATE INDEX idx_job_bids_bidder ON job_bids(bidder_dealer_id);

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE shop_price_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_news          ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_bids               ENABLE ROW LEVEL SECURITY;

-- helper: is approved dealer
CREATE OR REPLACE FUNCTION is_approved_dealer()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM dealer_users du
    JOIN dealers d ON du.dealer_id = d.id
    WHERE du.user_id = auth.uid() AND d.status = 'approved'
  );
$$;

-- helper: my dealer_id
CREATE OR REPLACE FUNCTION my_dealer_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT du.dealer_id FROM dealer_users du
  JOIN dealers d ON du.dealer_id = d.id
  WHERE du.user_id = auth.uid() AND d.status = 'approved'
  LIMIT 1;
$$;

-- Prices
CREATE POLICY "read_prices"   ON shop_price_submissions FOR SELECT USING (is_approved_dealer());
CREATE POLICY "insert_prices" ON shop_price_submissions FOR INSERT WITH CHECK (dealer_id = my_dealer_id());
CREATE POLICY "update_prices" ON shop_price_submissions FOR UPDATE USING (dealer_id = my_dealer_id());
CREATE POLICY "delete_prices" ON shop_price_submissions FOR DELETE USING (dealer_id = my_dealer_id());

-- News (approved dealers read published only)
CREATE POLICY "read_news" ON industry_news FOR SELECT
  USING (is_published = true AND is_approved_dealer());

-- Job Orders
CREATE POLICY "read_jobs"   ON job_orders FOR SELECT USING (is_approved_dealer());
CREATE POLICY "insert_jobs" ON job_orders FOR INSERT WITH CHECK (poster_dealer_id = my_dealer_id());
CREATE POLICY "update_jobs" ON job_orders FOR UPDATE USING (poster_dealer_id = my_dealer_id());

-- Job Bids
CREATE POLICY "read_bids"   ON job_bids FOR SELECT USING (is_approved_dealer());
CREATE POLICY "insert_bids" ON job_bids FOR INSERT WITH CHECK (bidder_dealer_id = my_dealer_id());
CREATE POLICY "update_bids" ON job_bids FOR UPDATE USING (bidder_dealer_id = my_dealer_id());
