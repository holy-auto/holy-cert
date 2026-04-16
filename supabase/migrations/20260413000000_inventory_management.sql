-- =============================================================================
-- Inventory Management
--   - inventory_items: 在庫アイテムのマスタ（名前、SKU、現在庫、最低在庫など）
--   - inventory_movements: 入出庫履歴（在庫変動は全てこのテーブル経由）
--
-- RLS: tenants スコープ。書き込みは my_tenant_ids() に含まれる tenant のみ。
-- =============================================================================

-- ─── inventory_items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  sku             text,
  category        text,
  unit            text NOT NULL DEFAULT '個',
  current_stock   numeric(12,2) NOT NULL DEFAULT 0,
  min_stock       numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost       integer,
  note            text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant
  ON inventory_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_active
  ON inventory_items(tenant_id, is_active);

-- SKU はテナント内で一意（任意項目なので NULL は除外）
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_tenant_sku
  ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL;

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_items_select" ON inventory_items
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "inventory_items_insert" ON inventory_items
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "inventory_items_update" ON inventory_items
  FOR UPDATE USING (tenant_id IN (SELECT my_tenant_ids()))
  WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "inventory_items_delete" ON inventory_items
  FOR DELETE USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ─── inventory_movements ─────────────────────────────────────────────────────
-- type: 'in' (入庫) / 'out' (出庫) / 'adjust' (棚卸調整)
-- quantity: 常に正の数。type で in/out を判定。
CREATE TABLE IF NOT EXISTS inventory_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('in', 'out', 'adjust')),
  quantity        numeric(12,2) NOT NULL CHECK (quantity >= 0),
  reason          text,
  reservation_id  uuid REFERENCES reservations(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_tenant
  ON inventory_movements(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item
  ON inventory_movements(item_id, created_at DESC);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_select" ON inventory_movements
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE POLICY "inventory_movements_insert" ON inventory_movements
  FOR INSERT WITH CHECK (tenant_id IN (SELECT my_tenant_ids()));

-- 履歴は基本的に update/delete しない（監査証跡）
CREATE POLICY "inventory_movements_delete" ON inventory_movements
  FOR DELETE USING (tenant_id IN (SELECT my_tenant_ids()));


-- ─── apply_inventory_movement ────────────────────────────────────────────────
-- 入出庫を記録し、inventory_items.current_stock を原子的に更新するヘルパー。
-- in     : +quantity
-- out    : -quantity （在庫不足は許容＝マイナス在庫警告のみ）
-- adjust : current_stock を quantity に置き換え
CREATE OR REPLACE FUNCTION apply_inventory_movement(
  p_item_id uuid,
  p_type text,
  p_quantity numeric,
  p_reason text DEFAULT NULL,
  p_reservation_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item inventory_items%ROWTYPE;
  v_new_stock numeric(12,2);
  v_movement_id uuid;
  v_user_id uuid;
BEGIN
  IF p_type NOT IN ('in', 'out', 'adjust') THEN
    RAISE EXCEPTION 'invalid_type: %', p_type;
  END IF;
  IF p_quantity IS NULL OR p_quantity < 0 THEN
    RAISE EXCEPTION 'invalid_quantity';
  END IF;

  -- RLS が自動で tenant を絞るので、ここで取得できれば権限 OK
  SELECT * INTO v_item FROM inventory_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_not_found';
  END IF;

  IF p_type = 'in' THEN
    v_new_stock := v_item.current_stock + p_quantity;
  ELSIF p_type = 'out' THEN
    v_new_stock := v_item.current_stock - p_quantity;
  ELSE  -- adjust
    v_new_stock := p_quantity;
  END IF;

  UPDATE inventory_items
    SET current_stock = v_new_stock
    WHERE id = v_item.id;

  v_user_id := auth.uid();

  INSERT INTO inventory_movements(tenant_id, item_id, type, quantity, reason, reservation_id, created_by)
    VALUES (v_item.tenant_id, v_item.id, p_type, p_quantity, p_reason, p_reservation_id, v_user_id)
    RETURNING id INTO v_movement_id;

  RETURN jsonb_build_object(
    'movement_id', v_movement_id,
    'item_id', v_item.id,
    'previous_stock', v_item.current_stock,
    'new_stock', v_new_stock
  );
END;
$$;

GRANT EXECUTE ON FUNCTION apply_inventory_movement(uuid, text, numeric, text, uuid) TO authenticated;
