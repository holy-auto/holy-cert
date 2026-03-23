-- 20260323080000_scale_indexes_types.sql
-- 金額カラムbigint変換 + 追加インデックス + certificate_images tenant_id追加

-- ============================================================
-- 1. 金額カラムをbigintに変換（SUMオーバーフロー防止）
-- ============================================================
ALTER TABLE payments ALTER COLUMN amount TYPE bigint;
ALTER TABLE payments ALTER COLUMN received_amount TYPE bigint;
ALTER TABLE payments ALTER COLUMN change_amount TYPE bigint;
ALTER TABLE payments ALTER COLUMN refund_amount TYPE bigint;

ALTER TABLE documents ALTER COLUMN subtotal TYPE bigint;
ALTER TABLE documents ALTER COLUMN tax TYPE bigint;
ALTER TABLE documents ALTER COLUMN total TYPE bigint;

ALTER TABLE reservations ALTER COLUMN estimated_amount TYPE bigint;

ALTER TABLE certificates ALTER COLUMN service_price TYPE bigint;

-- ============================================================
-- 2. 追加インデックス
-- ============================================================

-- menu_items: アクティブ品目の高速取得
CREATE INDEX IF NOT EXISTS idx_menu_items_tenant_active
  ON menu_items(tenant_id, is_active, sort_order) WHERE is_active = true;

-- payments: 顧客別支払履歴
CREATE INDEX IF NOT EXISTS idx_payments_tenant_customer
  ON payments(tenant_id, customer_id) WHERE customer_id IS NOT NULL;

-- payments: 店舗別日次集計
CREATE INDEX IF NOT EXISTS idx_payments_store_date
  ON payments(tenant_id, store_id, paid_at DESC) WHERE store_id IS NOT NULL;

-- documents: 帳票種別+ステータス+日付の複合（リスト表示最適化）
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type_status_created
  ON documents(tenant_id, doc_type, status, created_at DESC);

-- ============================================================
-- 3. certificate_images にtenant_idカラム追加（RLSサブクエリ排除）
-- ============================================================

-- カラム追加
ALTER TABLE certificate_images ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- 既存データにtenant_idを埋める
UPDATE certificate_images ci
SET tenant_id = c.tenant_id
FROM certificates c
WHERE ci.certificate_id = c.id AND ci.tenant_id IS NULL;

-- NOT NULL制約追加（既存データ更新後）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM certificate_images WHERE tenant_id IS NULL
  ) THEN
    ALTER TABLE certificate_images ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- FK追加
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_name = 'fk_certimg_tenant') THEN
    ALTER TABLE certificate_images
      ADD CONSTRAINT fk_certimg_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_certimg_tenant ON certificate_images(tenant_id);

-- RLSポリシー更新（サブクエリ排除）
DROP POLICY IF EXISTS "certificate_images_select_v2" ON certificate_images;
DROP POLICY IF EXISTS "certificate_images_insert_v2" ON certificate_images;
DROP POLICY IF EXISTS "certificate_images_update_v2" ON certificate_images;
DROP POLICY IF EXISTS "certificate_images_delete_v2" ON certificate_images;

CREATE POLICY "certificate_images_select_v3" ON certificate_images
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "certificate_images_insert_v3" ON certificate_images
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "certificate_images_update_v3" ON certificate_images
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin','staff')
  );

CREATE POLICY "certificate_images_delete_v3" ON certificate_images
  FOR DELETE USING (
    tenant_id IN (SELECT my_tenant_ids())
    AND my_tenant_role(tenant_id) IN ('owner','admin')
  );
