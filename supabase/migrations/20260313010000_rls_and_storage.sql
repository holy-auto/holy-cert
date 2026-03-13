-- ============================================================
-- RLS ポリシー本番向け設定
-- サービスロールキー（server-side）はバイパス。
-- クライアント側（anon/authenticated）へのアクセスを制限する。
-- ============================================================

-- ──────────────────────────────────────────
-- helpers: 現在のユーザーが所属するdealer_idを返す関数
-- ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION market_my_dealer_id()
RETURNS uuid AS $$
  SELECT dealer_id FROM dealer_users
  WHERE user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION market_is_approved_dealer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM dealer_users du
    JOIN dealers d ON d.id = du.dealer_id
    WHERE du.user_id = auth.uid()
    AND d.status = 'approved'
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ──────────────────────────────────────────
-- dealers
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "dealers_select" ON dealers;
DROP POLICY IF EXISTS "dealers_update" ON dealers;

CREATE POLICY "dealers_select"
  ON dealers FOR SELECT
  TO authenticated
  USING (
    -- 自社 + 承認済み業者のみ参照可
    id = market_my_dealer_id()
    OR status = 'approved'
  );

CREATE POLICY "dealers_update"
  ON dealers FOR UPDATE
  TO authenticated
  USING (id = market_my_dealer_id())
  WITH CHECK (id = market_my_dealer_id());

-- ──────────────────────────────────────────
-- dealer_users
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "dealer_users_select" ON dealer_users;

CREATE POLICY "dealer_users_select"
  ON dealer_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────
-- inventory_listings
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "listings_select" ON inventory_listings;
DROP POLICY IF EXISTS "listings_insert" ON inventory_listings;
DROP POLICY IF EXISTS "listings_update" ON inventory_listings;
DROP POLICY IF EXISTS "listings_delete" ON inventory_listings;

-- 掲載中・商談中は全承認業者が参照可／非公開・売却済みは自社のみ
CREATE POLICY "listings_select"
  ON inventory_listings FOR SELECT
  TO authenticated
  USING (
    market_is_approved_dealer() AND (
      status IN ('active', 'reserved')
      OR dealer_id = market_my_dealer_id()
    )
  );

CREATE POLICY "listings_insert"
  ON inventory_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    market_is_approved_dealer()
    AND dealer_id = market_my_dealer_id()
  );

CREATE POLICY "listings_update"
  ON inventory_listings FOR UPDATE
  TO authenticated
  USING (
    market_is_approved_dealer()
    AND dealer_id = market_my_dealer_id()
  )
  WITH CHECK (dealer_id = market_my_dealer_id());

CREATE POLICY "listings_delete"
  ON inventory_listings FOR DELETE
  TO authenticated
  USING (dealer_id = market_my_dealer_id());

-- ──────────────────────────────────────────
-- listing_images
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "images_select" ON listing_images;
DROP POLICY IF EXISTS "images_insert" ON listing_images;
DROP POLICY IF EXISTS "images_delete" ON listing_images;

CREATE POLICY "images_select"
  ON listing_images FOR SELECT
  TO authenticated
  USING (
    market_is_approved_dealer()
    AND EXISTS (
      SELECT 1 FROM inventory_listings il
      WHERE il.id = listing_id
      AND (il.status IN ('active', 'reserved') OR il.dealer_id = market_my_dealer_id())
    )
  );

CREATE POLICY "images_insert"
  ON listing_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_listings il
      WHERE il.id = listing_id
      AND il.dealer_id = market_my_dealer_id()
    )
  );

CREATE POLICY "images_delete"
  ON listing_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_listings il
      WHERE il.id = listing_id
      AND il.dealer_id = market_my_dealer_id()
    )
  );

-- ──────────────────────────────────────────
-- listing_inquiries
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "inquiries_select" ON listing_inquiries;
DROP POLICY IF EXISTS "inquiries_insert" ON listing_inquiries;
DROP POLICY IF EXISTS "inquiries_update" ON listing_inquiries;

CREATE POLICY "inquiries_select"
  ON listing_inquiries FOR SELECT
  TO authenticated
  USING (
    from_dealer_id = market_my_dealer_id()
    OR to_dealer_id = market_my_dealer_id()
  );

CREATE POLICY "inquiries_insert"
  ON listing_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (
    market_is_approved_dealer()
    AND from_dealer_id = market_my_dealer_id()
  );

CREATE POLICY "inquiries_update"
  ON listing_inquiries FOR UPDATE
  TO authenticated
  USING (
    from_dealer_id = market_my_dealer_id()
    OR to_dealer_id = market_my_dealer_id()
  );

-- ──────────────────────────────────────────
-- inquiry_messages
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select" ON inquiry_messages;
DROP POLICY IF EXISTS "messages_insert" ON inquiry_messages;

CREATE POLICY "messages_select"
  ON inquiry_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM listing_inquiries li
      WHERE li.id = inquiry_id
      AND (li.from_dealer_id = market_my_dealer_id()
           OR li.to_dealer_id = market_my_dealer_id())
    )
  );

CREATE POLICY "messages_insert"
  ON inquiry_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_dealer_id = market_my_dealer_id()
    AND EXISTS (
      SELECT 1 FROM listing_inquiries li
      WHERE li.id = inquiry_id
      AND (li.from_dealer_id = market_my_dealer_id()
           OR li.to_dealer_id = market_my_dealer_id())
    )
  );

-- ──────────────────────────────────────────
-- deals
-- ──────────────────────────────────────────
DROP POLICY IF EXISTS "deals_select" ON deals;
DROP POLICY IF EXISTS "deals_insert" ON deals;
DROP POLICY IF EXISTS "deals_update" ON deals;

CREATE POLICY "deals_select"
  ON deals FOR SELECT
  TO authenticated
  USING (
    buyer_dealer_id = market_my_dealer_id()
    OR seller_dealer_id = market_my_dealer_id()
  );

CREATE POLICY "deals_insert"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (
    market_is_approved_dealer()
    AND seller_dealer_id = market_my_dealer_id()
  );

CREATE POLICY "deals_update"
  ON deals FOR UPDATE
  TO authenticated
  USING (
    buyer_dealer_id = market_my_dealer_id()
    OR seller_dealer_id = market_my_dealer_id()
  );

-- ============================================================
-- ストレージバケット設定
-- ============================================================

-- assets バケット（画像保存）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,  -- 公開バケット（URL直接アクセス可）
  10485760,  -- 10MB 上限
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

-- ストレージポリシー
-- 認証済み業者はアップロード可
DROP POLICY IF EXISTS "assets_upload" ON storage.objects;
DROP POLICY IF EXISTS "assets_select" ON storage.objects;
DROP POLICY IF EXISTS "assets_delete" ON storage.objects;

CREATE POLICY "assets_select"
  ON storage.objects FOR SELECT
  TO public  -- 公開バケットなので誰でも参照可
  USING (bucket_id = 'assets');

CREATE POLICY "assets_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assets'
    AND market_is_approved_dealer()
    -- パスは market/listings/{listing_id}/ 以下のみ
    AND (storage.foldername(name))[1] = 'market'
  );

CREATE POLICY "assets_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'assets'
    AND market_is_approved_dealer()
  );
