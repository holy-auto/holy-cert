-- =============================================================
-- Demo Seed: Manufacturer Portal Demo Data
-- メーカーポータル デモ用サンプルデータ
-- =============================================================
-- Seeds a demo manufacturer with one template so /manufacturer can
-- be showcased. The Supabase Auth user + membership row are created
-- separately by scripts/setup-demo-manufacturer.ts.
--
-- IDs use the 00..-de... convention already established by the
-- insurer demo seed (20260502000001) for easy cleanup.
-- =============================================================

do $$ begin

  -- ─────────────────────────────────────────
  -- 1) Demo manufacturer
  -- ─────────────────────────────────────────
  insert into manufacturers (
    id, name, slug, description, website_url,
    contact_email, contact_phone, is_active
  ) values (
    '00000000-0000-0000-0000-de0000000200'::uuid,
    'デモコーティング工業株式会社',
    'demo-manufacturer',
    'Ledra デモ用の架空メーカー。実際の運用ではこのレコードを削除してください。',
    'https://example.com/demo-manufacturer',
    'demo@manufacturer.ledra.test',
    '03-0000-0200',
    true
  )
  on conflict (id) do nothing;

  -- ─────────────────────────────────────────
  -- 2) Demo manufacturer template (coating)
  -- ─────────────────────────────────────────
  insert into manufacturer_templates (
    id, manufacturer_id, name, description, service_type,
    config_json, layout_key, is_active, sort_order
  ) values (
    '00000000-0000-0000-0000-de0000000201'::uuid,
    '00000000-0000-0000-0000-de0000000200'::uuid,
    'デモ プレミアム コーティング',
    'デモ用に登録された固定デザイン。メーカーロゴ・色・必須項目はすべて運営承認済み。',
    'coating',
    '{
      "version": 1,
      "branding": {
        "company_name": "デモコーティング工業株式会社",
        "primary_color": "#1a1a2e",
        "accent_color": "#7c3aed",
        "logo_position": "top-left"
      },
      "header": {
        "title": "プレミアム コーティング 施工証明書",
        "subtitle": "デモコーティング工業 認定施工店発行",
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
        "show_ledra_badge": true,
        "warranty_text": "本証明書は メーカー承認 を受けた施工店のみが発行できます。"
      },
      "style": {
        "font_family": "noto-sans-jp",
        "border_style": "elegant",
        "background_variant": "white"
      }
    }'::jsonb,
    'standard',
    true,
    0
  )
  on conflict (id) do nothing;

end $$;
