-- ============================================================
-- Shop Products & Orders
-- カタログ商品（NFCタグ、ブランド証明書、グッズ等）の販売管理
-- ============================================================

-- 商品マスタ（運営が管理）
CREATE TABLE shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('nfc_tag', 'certificate_template', 'sticker', 'sign', 'banner', 'other')),
  price integer NOT NULL,                    -- 税抜価格（円）
  tax_rate numeric NOT NULL DEFAULT 0.10,
  unit text NOT NULL DEFAULT '個',
  min_quantity integer NOT NULL DEFAULT 1,
  image_path text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}',          -- カテゴリ固有の設定
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 加盟店からの注文
CREATE TABLE shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')),
  payment_method text NOT NULL
    CHECK (payment_method IN ('stripe', 'invoice')),
  subtotal integer NOT NULL DEFAULT 0,
  tax integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  note text,
  shipped_at timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_orders_tenant ON shop_orders(tenant_id);

-- 注文明細
CREATE TABLE shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES shop_products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  tax_rate numeric NOT NULL DEFAULT 0.10,
  amount integer NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- shop_products: 認証済みユーザーなら閲覧可
CREATE POLICY "shop_products_select" ON shop_products
  FOR SELECT USING (true);

-- shop_orders: テナントメンバーのみ
CREATE POLICY "shop_orders_select" ON shop_orders
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "shop_orders_insert" ON shop_orders
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "shop_orders_update" ON shop_orders
  FOR UPDATE USING (tenant_id IN (SELECT my_tenant_ids()));

-- shop_order_items: 注文の所属テナントメンバー
CREATE POLICY "shop_order_items_select" ON shop_order_items
  FOR SELECT USING (order_id IN (SELECT id FROM shop_orders WHERE tenant_id IN (SELECT my_tenant_ids())));

CREATE POLICY "shop_order_items_insert" ON shop_order_items
  FOR INSERT WITH CHECK (order_id IN (SELECT id FROM shop_orders WHERE tenant_id IN (SELECT my_tenant_ids())));

-- ============================================================
-- Seed: 初期商品データ
-- ============================================================
INSERT INTO shop_products (name, description, category, price, unit, min_quantity, sort_order, meta) VALUES
  ('NFCタグ 10枚パック', 'Ledra認証NFCタグ。車両に装着して証明書へ即アクセス。', 'nfc_tag', 5500, 'パック', 1, 10, '{"quantity_per_pack": 10}'),
  ('NFCタグ 30枚パック', 'NFCタグ30枚のお得パック（10%OFF）', 'nfc_tag', 14850, 'パック', 1, 20, '{"quantity_per_pack": 30}'),
  ('NFCタグ 50枚パック', 'NFCタグ50枚の大容量パック（20%OFF）', 'nfc_tag', 22000, 'パック', 1, 30, '{"quantity_per_pack": 50}'),
  ('ブランド証明書 ライト', '既製テンプレートから選択。ロゴ・社名の反映、ブランドカラー設定。月額サブスクリプション。', 'certificate_template', 3300, '月', 1, 40, '{"type": "preset", "setup_fee": 16500, "billing": "monthly"}'),
  ('ブランド証明書 プレミアム', '専任担当によるオリジナルデザイン制作。フルカスタム対応。月額サブスクリプション。', 'certificate_template', 4400, '月', 1, 50, '{"type": "custom", "setup_fee": 88000, "billing": "monthly"}'),
  ('Ledra認定ステッカー 10枚セット', '店舗掲示用のLedra認定ステッカー。耐水・耐UV仕様。', 'sticker', 3300, 'セット', 1, 60, '{}'),
  ('店頭のぼり', 'Ledra公式のぼり旗。施工実績をアピール。', 'banner', 8800, '本', 1, 70, '{}'),
  ('店頭看板（A3）', 'Ledra認定ショップ看板。A3サイズ、アルミフレーム付き。', 'sign', 16500, '枚', 1, 80, '{}');
