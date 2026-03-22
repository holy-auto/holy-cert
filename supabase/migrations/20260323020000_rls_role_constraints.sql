-- =============================================================
-- RLS Role Constraints Migration
-- Adds role-based access control to RLS policies.
-- Rules:
--   SELECT : all roles (owner, admin, staff, viewer)
--   INSERT : owner, admin, staff
--   UPDATE : owner, admin, staff
--   DELETE : owner, admin only
-- Special:
--   tenant_memberships UPDATE/DELETE : owner only
--   tenants UPDATE : owner only
--   insurer_access_logs INSERT : insurer_users only
-- =============================================================

-- -------------------------------------------------------
-- 0) Helper function: get caller's role within a tenant
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION my_tenant_role(p_tenant_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.tenant_memberships
  WHERE user_id = auth.uid() AND tenant_id = p_tenant_id
  LIMIT 1;
$$;

-- =============================================================
-- 1) vehicles
-- =============================================================
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;

CREATE POLICY "vehicles_select_v2" ON vehicles
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "vehicles_insert_v2" ON vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "vehicles_update_v2" ON vehicles
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "vehicles_delete_v2" ON vehicles
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 2) certificates
-- =============================================================
DROP POLICY IF EXISTS "certs_select" ON certificates;
DROP POLICY IF EXISTS "certs_insert" ON certificates;
DROP POLICY IF EXISTS "certs_update" ON certificates;

CREATE POLICY "certificates_select_v2" ON certificates
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "certificates_insert_v2" ON certificates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "certificates_update_v2" ON certificates
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "certificates_delete_v2" ON certificates
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 3) certificate_images
-- =============================================================
DROP POLICY IF EXISTS "certimg_select" ON certificate_images;
DROP POLICY IF EXISTS "certimg_insert" ON certificate_images;

CREATE POLICY "certificate_images_select_v2" ON certificate_images
  FOR SELECT USING (
    certificate_id IN (
      SELECT id FROM certificates WHERE tenant_id IN (SELECT my_tenant_ids())
    )
  );

CREATE POLICY "certificate_images_insert_v2" ON certificate_images
  FOR INSERT WITH CHECK (
    certificate_id IN (
      SELECT id FROM certificates
      WHERE tenant_id IN (SELECT my_tenant_ids())
        AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
    )
  );

CREATE POLICY "certificate_images_update_v2" ON certificate_images
  FOR UPDATE USING (
    certificate_id IN (
      SELECT id FROM certificates
      WHERE tenant_id IN (SELECT my_tenant_ids())
        AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
    )
  );

CREATE POLICY "certificate_images_delete_v2" ON certificate_images
  FOR DELETE USING (
    certificate_id IN (
      SELECT id FROM certificates
      WHERE tenant_id IN (SELECT my_tenant_ids())
        AND my_tenant_role(tenant_id) IN ('owner','admin')
    )
  );

-- =============================================================
-- 4) templates
-- =============================================================
DROP POLICY IF EXISTS "tpl_select" ON templates;
DROP POLICY IF EXISTS "tpl_insert" ON templates;
DROP POLICY IF EXISTS "tpl_update" ON templates;
DROP POLICY IF EXISTS "tpl_delete" ON templates;

CREATE POLICY "templates_select_v2" ON templates
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "templates_insert_v2" ON templates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "templates_update_v2" ON templates
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "templates_delete_v2" ON templates
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 5) vehicle_histories
-- =============================================================
DROP POLICY IF EXISTS "vh_select" ON vehicle_histories;
DROP POLICY IF EXISTS "vh_insert" ON vehicle_histories;

CREATE POLICY "vehicle_histories_select_v2" ON vehicle_histories
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "vehicle_histories_insert_v2" ON vehicle_histories
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "vehicle_histories_update_v2" ON vehicle_histories
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "vehicle_histories_delete_v2" ON vehicle_histories
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 6) nfc_tags
-- =============================================================
DROP POLICY IF EXISTS "nfc_select" ON nfc_tags;
DROP POLICY IF EXISTS "nfc_insert" ON nfc_tags;
DROP POLICY IF EXISTS "nfc_update" ON nfc_tags;

CREATE POLICY "nfc_tags_select_v2" ON nfc_tags
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "nfc_tags_insert_v2" ON nfc_tags
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "nfc_tags_update_v2" ON nfc_tags
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "nfc_tags_delete_v2" ON nfc_tags
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 7) documents
-- =============================================================
DROP POLICY IF EXISTS "documents_tenant_select" ON documents;
DROP POLICY IF EXISTS "documents_tenant_insert" ON documents;
DROP POLICY IF EXISTS "documents_tenant_update" ON documents;
DROP POLICY IF EXISTS "documents_tenant_delete" ON documents;

CREATE POLICY "documents_select_v2" ON documents
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "documents_insert_v2" ON documents
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "documents_update_v2" ON documents
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "documents_delete_v2" ON documents
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 8) menu_items
-- =============================================================
DROP POLICY IF EXISTS "menu_items_tenant_select" ON menu_items;
DROP POLICY IF EXISTS "menu_items_tenant_insert" ON menu_items;
DROP POLICY IF EXISTS "menu_items_tenant_update" ON menu_items;
DROP POLICY IF EXISTS "menu_items_tenant_delete" ON menu_items;

CREATE POLICY "menu_items_select_v2" ON menu_items
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "menu_items_insert_v2" ON menu_items
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "menu_items_update_v2" ON menu_items
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "menu_items_delete_v2" ON menu_items
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 9) customers
-- =============================================================
DROP POLICY IF EXISTS "customers_tenant_select" ON customers;
DROP POLICY IF EXISTS "customers_tenant_insert" ON customers;
DROP POLICY IF EXISTS "customers_tenant_update" ON customers;
DROP POLICY IF EXISTS "customers_tenant_delete" ON customers;

CREATE POLICY "customers_select_v2" ON customers
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "customers_insert_v2" ON customers
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "customers_update_v2" ON customers
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "customers_delete_v2" ON customers
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 10) reservations
-- =============================================================
DROP POLICY IF EXISTS "reservations_tenant_select" ON reservations;
DROP POLICY IF EXISTS "reservations_tenant_insert" ON reservations;
DROP POLICY IF EXISTS "reservations_tenant_update" ON reservations;
DROP POLICY IF EXISTS "reservations_tenant_delete" ON reservations;

CREATE POLICY "reservations_select_v2" ON reservations
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "reservations_insert_v2" ON reservations
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "reservations_update_v2" ON reservations
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "reservations_delete_v2" ON reservations
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 11) invoices
-- =============================================================
DROP POLICY IF EXISTS "invoices_tenant_select" ON invoices;
DROP POLICY IF EXISTS "invoices_tenant_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_tenant_update" ON invoices;
DROP POLICY IF EXISTS "invoices_tenant_delete" ON invoices;

CREATE POLICY "invoices_select_v2" ON invoices
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "invoices_insert_v2" ON invoices
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "invoices_update_v2" ON invoices
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "invoices_delete_v2" ON invoices
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 12) market_vehicles
-- =============================================================
DROP POLICY IF EXISTS "tenant_market_vehicles_select" ON market_vehicles;
DROP POLICY IF EXISTS "tenant_market_vehicles_insert" ON market_vehicles;
DROP POLICY IF EXISTS "tenant_market_vehicles_update" ON market_vehicles;
DROP POLICY IF EXISTS "tenant_market_vehicles_delete" ON market_vehicles;

CREATE POLICY "market_vehicles_select_v2" ON market_vehicles
  FOR SELECT USING (
    tenant_id IN (SELECT my_tenant_ids())
    OR status = 'listed'
  );

CREATE POLICY "market_vehicles_insert_v2" ON market_vehicles
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_vehicles_update_v2" ON market_vehicles
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_vehicles_delete_v2" ON market_vehicles
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 13) market_vehicle_images
-- =============================================================
DROP POLICY IF EXISTS "tenant_market_vehicle_images_select" ON market_vehicle_images;
DROP POLICY IF EXISTS "tenant_market_vehicle_images_insert" ON market_vehicle_images;
DROP POLICY IF EXISTS "tenant_market_vehicle_images_delete" ON market_vehicle_images;

CREATE POLICY "market_vehicle_images_select_v2" ON market_vehicle_images
  FOR SELECT USING (
    tenant_id IN (SELECT my_tenant_ids())
    OR vehicle_id IN (
      SELECT id FROM market_vehicles WHERE status = 'listed'
    )
  );

CREATE POLICY "market_vehicle_images_insert_v2" ON market_vehicle_images
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_vehicle_images_delete_v2" ON market_vehicle_images
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 14) market_inquiries
-- =============================================================
DROP POLICY IF EXISTS "seller can view own inquiries" ON market_inquiries;
DROP POLICY IF EXISTS "anyone can create inquiry" ON market_inquiries;
DROP POLICY IF EXISTS "seller can update own inquiries" ON market_inquiries;

CREATE POLICY "market_inquiries_select_v2" ON market_inquiries
  FOR SELECT USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
  );

-- Inquiries can be created by anyone (buyer submits inquiry)
CREATE POLICY "market_inquiries_insert_v2" ON market_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "market_inquiries_update_v2" ON market_inquiries
  FOR UPDATE USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(seller_tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_inquiries_delete_v2" ON market_inquiries
  FOR DELETE USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(seller_tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 15) market_inquiry_messages
-- =============================================================
DROP POLICY IF EXISTS "participants can view messages" ON market_inquiry_messages;
DROP POLICY IF EXISTS "anyone can create messages" ON market_inquiry_messages;

CREATE POLICY "market_inquiry_messages_select_v2" ON market_inquiry_messages
  FOR SELECT USING (
    inquiry_id IN (
      SELECT id FROM market_inquiries
      WHERE seller_tenant_id IN (SELECT my_tenant_ids())
    )
  );

-- Messages can be created by anyone (buyer or seller)
CREATE POLICY "market_inquiry_messages_insert_v2" ON market_inquiry_messages
  FOR INSERT WITH CHECK (true);

-- =============================================================
-- 16) market_deals
-- =============================================================
DROP POLICY IF EXISTS "seller can view own deals" ON market_deals;
DROP POLICY IF EXISTS "seller can manage own deals" ON market_deals;

CREATE POLICY "market_deals_select_v2" ON market_deals
  FOR SELECT USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "market_deals_insert_v2" ON market_deals
  FOR INSERT WITH CHECK (
    seller_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(seller_tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_deals_update_v2" ON market_deals
  FOR UPDATE USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(seller_tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "market_deals_delete_v2" ON market_deals
  FOR DELETE USING (
    seller_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(seller_tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 17) job_orders
-- =============================================================
DROP POLICY IF EXISTS "job_orders_select" ON job_orders;
DROP POLICY IF EXISTS "job_orders_insert" ON job_orders;
DROP POLICY IF EXISTS "job_orders_update" ON job_orders;

CREATE POLICY "job_orders_select_v2" ON job_orders
  FOR SELECT USING (
    from_tenant_id IN (SELECT my_tenant_ids())
    OR to_tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "job_orders_insert_v2" ON job_orders
  FOR INSERT WITH CHECK (
    from_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(from_tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "job_orders_update_v2" ON job_orders
  FOR UPDATE USING (
    (
      from_tenant_id IN (SELECT my_tenant_ids())
      AND my_tenant_role(from_tenant_id) IN ('owner','admin','staff')
    )
    OR (
      to_tenant_id IN (SELECT my_tenant_ids())
      AND my_tenant_role(to_tenant_id) IN ('owner','admin','staff')
    )
  );

CREATE POLICY "job_orders_delete_v2" ON job_orders
  FOR DELETE USING (
    from_tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(from_tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 18) stores
-- =============================================================
DROP POLICY IF EXISTS "stores_tenant_select" ON stores;
DROP POLICY IF EXISTS "stores_tenant_manage" ON stores;

CREATE POLICY "stores_select_v2" ON stores
  FOR SELECT USING (
    tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "stores_insert_v2" ON stores
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

CREATE POLICY "stores_update_v2" ON stores
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

CREATE POLICY "stores_delete_v2" ON stores
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 19) store_memberships
-- =============================================================
DROP POLICY IF EXISTS "store_memberships_select" ON store_memberships;
DROP POLICY IF EXISTS "store_memberships_manage" ON store_memberships;

CREATE POLICY "store_memberships_select_v2" ON store_memberships
  FOR SELECT USING (
    tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "store_memberships_insert_v2" ON store_memberships
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

CREATE POLICY "store_memberships_update_v2" ON store_memberships
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

CREATE POLICY "store_memberships_delete_v2" ON store_memberships
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 20) brands
-- =============================================================
DROP POLICY IF EXISTS "brands_select" ON brands;
DROP POLICY IF EXISTS "brands_insert" ON brands;
DROP POLICY IF EXISTS "brands_update" ON brands;
DROP POLICY IF EXISTS "brands_delete" ON brands;

CREATE POLICY "brands_select_v2" ON brands
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "brands_insert_v2" ON brands
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "brands_update_v2" ON brands
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "brands_delete_v2" ON brands
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 21) coating_products
-- =============================================================
DROP POLICY IF EXISTS "coating_products_select" ON coating_products;
DROP POLICY IF EXISTS "coating_products_insert" ON coating_products;
DROP POLICY IF EXISTS "coating_products_update" ON coating_products;
DROP POLICY IF EXISTS "coating_products_delete" ON coating_products;

CREATE POLICY "coating_products_select_v2" ON coating_products
  FOR SELECT USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "coating_products_insert_v2" ON coating_products
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "coating_products_update_v2" ON coating_products
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "coating_products_delete_v2" ON coating_products
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );

-- =============================================================
-- 22) tenant_memberships (special: owner only for UPDATE/DELETE)
-- =============================================================
DROP POLICY IF EXISTS "tm_select_own" ON tenant_memberships;

CREATE POLICY "tenant_memberships_select_v2" ON tenant_memberships
  FOR SELECT USING (
    user_id = auth.uid()
    OR tenant_id IN (SELECT my_tenant_ids())
  );

CREATE POLICY "tenant_memberships_insert_v2" ON tenant_memberships
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) = 'owner'
  );

CREATE POLICY "tenant_memberships_update_v2" ON tenant_memberships
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) = 'owner'
  );

CREATE POLICY "tenant_memberships_delete_v2" ON tenant_memberships
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) = 'owner'
  );

-- =============================================================
-- 23) tenants (special: owner only for UPDATE)
-- =============================================================
DROP POLICY IF EXISTS "tenant_select_own" ON tenants;

CREATE POLICY "tenants_select_v2" ON tenants
  FOR SELECT USING (id IN (SELECT my_tenant_ids()));

CREATE POLICY "tenants_update_v2" ON tenants
  FOR UPDATE USING (
    id IN (SELECT my_tenant_ids())
    AND my_tenant_role(id) = 'owner'
  );

-- =============================================================
-- 24) insurer_access_logs (special: insurer_users only)
-- =============================================================
DROP POLICY IF EXISTS "ial_insert" ON insurer_access_logs;

CREATE POLICY "insurer_access_logs_insert_v2" ON insurer_access_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM insurer_users
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );
