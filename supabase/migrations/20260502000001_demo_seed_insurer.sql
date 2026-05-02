-- =============================================================
-- Demo Seed: Insurer Portal Demo Data
-- 保険会社ポータル デモ用サンプルデータ
-- =============================================================
-- This migration inserts a demo insurer record so the insurer
-- portal can be showcased. The Supabase Auth user must be created
-- separately (see scripts/setup-demo-insurer.ts).
-- =============================================================

do $$ begin

  -- ─────────────────────────────────────────
  -- 1) Demo insurer record (Pro plan)
  -- ─────────────────────────────────────────
  insert into insurers (
    id, name, slug, plan_tier, is_active,
    contact_email, contact_phone, address
  ) values (
    '00000000-0000-0000-0000-de0000000100'::uuid,
    'デモ損害保険株式会社',
    'demo-insurer',
    'pro',
    true,
    'demo@insurer.ledra.test',
    '03-0000-0100',
    '東京都港区デモ虎ノ門1-2-3 デモ虎ノ門ビル 10F'
  )
  on conflict (id) do nothing;

  -- ─────────────────────────────────────────
  -- 2) Demo saved searches
  -- ─────────────────────────────────────────
  insert into insurer_saved_searches (
    id, insurer_id, name, query, status_filter, date_from, date_to
  ) values (
    '30000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-de0000000100'::uuid,
    '直近30日 アクティブ証明書',
    '',
    'active',
    (current_date - interval '30 days')::date,
    current_date
  )
  on conflict (id) do nothing;

  insert into insurer_saved_searches (
    id, insurer_id, name, query, status_filter, date_from, date_to
  ) values (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-de0000000100'::uuid,
    'トヨタ車 検索',
    'トヨタ',
    null,
    null,
    null
  )
  on conflict (id) do nothing;

  insert into insurer_saved_searches (
    id, insurer_id, name, query, status_filter, date_from, date_to
  ) values (
    '30000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-de0000000100'::uuid,
    '無効化された証明書',
    '',
    'void',
    null,
    null
  )
  on conflict (id) do nothing;

end $$;
