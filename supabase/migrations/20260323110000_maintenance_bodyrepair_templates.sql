-- 整備 (Maintenance) / 鈑金塗装 (Body Repair/Paint) テンプレートサポート

-- 1. certificates テーブルに maintenance_json カラム追加
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS maintenance_json jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN certificates.maintenance_json IS
  '整備記録 {work_type, mileage, parts_replaced, next_service_date, findings, mechanic_name}';

-- 2. certificates テーブルに body_repair_json カラム追加
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS body_repair_json jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN certificates.body_repair_json IS
  '鈑金塗装記録 {repair_type, affected_panels, paint_color_code, paint_type, repair_method, before_notes, after_notes}';

-- 3. platform_templates.category の CHECK制約を更新して maintenance, body_repair を追加
ALTER TABLE platform_templates
  DROP CONSTRAINT IF EXISTS platform_templates_category_check;
ALTER TABLE platform_templates
  ADD CONSTRAINT platform_templates_category_check
  CHECK (category IN ('coating', 'detailing', 'maintenance', 'general', 'ppf', 'body_repair'));

-- 4. 整備テンプレート初期データ
INSERT INTO platform_templates (name, description, category, layout_key, base_config, sort_order)
VALUES (
  '整備スタンダード',
  '定期点検・車検・各種整備の証明書テンプレート',
  'maintenance',
  'standard',
  '{
    "version": 1,
    "branding": { "company_name": "" },
    "header": {
      "title": "整備証明書",
      "show_issue_date": true,
      "show_certificate_no": true
    },
    "body": {
      "show_customer_name": true,
      "show_vehicle_info": true,
      "show_service_details": true,
      "show_photos": true
    },
    "footer": {
      "show_qr": true,
      "show_cartrust_badge": true,
      "warranty_text": "",
      "notice_text": ""
    },
    "style": {
      "font_family": "noto-sans-jp",
      "border_style": "simple",
      "background_variant": "white"
    }
  }'::jsonb,
  20
)
ON CONFLICT DO NOTHING;

-- 5. 鈑金塗装テンプレート初期データ
INSERT INTO platform_templates (name, description, category, layout_key, base_config, sort_order)
VALUES (
  '鈑金塗装スタンダード',
  '鈑金・塗装・鈑金塗装の施工証明書テンプレート',
  'body_repair',
  'standard',
  '{
    "version": 1,
    "branding": { "company_name": "" },
    "header": {
      "title": "鈑金塗装証明書",
      "show_issue_date": true,
      "show_certificate_no": true
    },
    "body": {
      "show_customer_name": true,
      "show_vehicle_info": true,
      "show_service_details": true,
      "show_photos": true
    },
    "footer": {
      "show_qr": true,
      "show_cartrust_badge": true,
      "warranty_text": "",
      "notice_text": ""
    },
    "style": {
      "font_family": "noto-sans-jp",
      "border_style": "simple",
      "background_variant": "white"
    }
  }'::jsonb,
  30
)
ON CONFLICT DO NOTHING;
