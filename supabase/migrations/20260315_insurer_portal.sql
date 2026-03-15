-- ============================================================
-- 保険会社ポータル基盤 マイグレーション
-- insurers / insurer_users テーブル + RPC関数 + RLS
-- ============================================================

-- ============================================================
-- 1) insurers (保険会社マスタ)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_kana     text,
  code          text UNIQUE,
  contact_email text,
  contact_phone text,
  address       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insurers_code ON insurers(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insurers_active ON insurers(is_active) WHERE is_active = true;

ALTER TABLE insurers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_insurers_updated_at
  BEFORE UPDATE ON insurers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2) insurer_users (保険会社ユーザー)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurer_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id   uuid NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'member'
                 CHECK (role IN ('admin', 'member', 'viewer', 'auditor')),
  display_name text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (insurer_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_insurer_users_user ON insurer_users(user_id);
CREATE INDEX IF NOT EXISTS idx_insurer_users_insurer ON insurer_users(insurer_id);

ALTER TABLE insurer_users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_insurer_users_updated_at
  BEFORE UPDATE ON insurer_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 3) ヘルパー関数
-- ============================================================

-- 現在ユーザーの insurer_id を返す
CREATE OR REPLACE FUNCTION my_insurer_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT insurer_id
  FROM public.insurer_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;
$$;

-- 現在ユーザーが保険会社 admin か判定
CREATE OR REPLACE FUNCTION is_insurer_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.insurer_users
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- ============================================================
-- 4) RLS ポリシー
-- ============================================================

-- insurers: 保険会社ユーザーは自社のみ閲覧
CREATE POLICY "insurers_select_own" ON insurers
  FOR SELECT USING (
    id = my_insurer_id()
  );

-- insurer_users: 同一 insurer のユーザーのみ閲覧
CREATE POLICY "insurer_users_select_own" ON insurer_users
  FOR SELECT USING (
    insurer_id = my_insurer_id()
  );

-- insurer_users: 自分自身のレコードは常に閲覧可能
CREATE POLICY "insurer_users_select_self" ON insurer_users
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- insurer_access_logs: 保険会社ユーザーは自社ログを閲覧可能
CREATE POLICY "ial_insurer_select" ON insurer_access_logs
  FOR SELECT USING (
    insurer_id = my_insurer_id()
  );

-- ============================================================
-- 5) insurer_search_certificates() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION insurer_search_certificates(
  p_query      text DEFAULT '',
  p_limit      integer DEFAULT 50,
  p_offset     integer DEFAULT 0,
  p_ip         text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  id               uuid,
  public_id        text,
  tenant_id        uuid,
  status           text,
  customer_name    text,
  vehicle_info_json jsonb,
  certificate_no   text,
  service_type     text,
  expiry_type      text,
  expiry_value     text,
  created_at       timestamptz,
  updated_at       timestamptz,
  tenant_name      text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_insurer_id uuid;
  v_user_id    uuid;
  v_search     text;
BEGIN
  -- 呼び出し元ユーザーの insurer_id を検証
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT iu.insurer_id INTO v_insurer_id
  FROM public.insurer_users iu
  WHERE iu.user_id = v_user_id AND iu.is_active = true
  LIMIT 1;

  IF v_insurer_id IS NULL THEN
    RAISE EXCEPTION 'Not an insurer user';
  END IF;

  -- 監査ログ記録
  INSERT INTO public.insurer_access_logs (insurer_id, insurer_user_id, action, meta, ip, user_agent)
  VALUES (
    v_insurer_id,
    v_user_id,
    'search',
    jsonb_build_object('query', p_query, 'limit', p_limit, 'offset', p_offset),
    p_ip,
    p_user_agent
  );

  -- 検索クエリ組み立て
  v_search := '%' || COALESCE(NULLIF(TRIM(p_query), ''), '') || '%';

  IF TRIM(COALESCE(p_query, '')) = '' THEN
    -- 空クエリ: 全件返却（ページネーション付き）
    RETURN QUERY
    SELECT
      c.id, c.public_id, c.tenant_id, c.status,
      c.customer_name, c.vehicle_info_json,
      c.certificate_no, c.service_type,
      c.expiry_type, c.expiry_value,
      c.created_at, c.updated_at,
      t.name AS tenant_name
    FROM public.certificates c
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE c.status IN ('active', 'void', 'expired')
    ORDER BY c.created_at DESC
    LIMIT LEAST(p_limit, 200)
    OFFSET p_offset;
  ELSE
    -- テキスト検索
    RETURN QUERY
    SELECT
      c.id, c.public_id, c.tenant_id, c.status,
      c.customer_name, c.vehicle_info_json,
      c.certificate_no, c.service_type,
      c.expiry_type, c.expiry_value,
      c.created_at, c.updated_at,
      t.name AS tenant_name
    FROM public.certificates c
    LEFT JOIN public.tenants t ON t.id = c.tenant_id
    WHERE c.status IN ('active', 'void', 'expired')
      AND (
        c.public_id ILIKE v_search
        OR c.customer_name ILIKE v_search
        OR c.certificate_no ILIKE v_search
        OR c.service_type ILIKE v_search
        OR c.vehicle_info_json->>'model' ILIKE v_search
        OR c.vehicle_info_json->>'plate' ILIKE v_search
        OR c.vehicle_info_json->>'maker' ILIKE v_search
        OR c.vehicle_info_json->>'plate_display' ILIKE v_search
        OR c.vehicle_info_json->>'vin' ILIKE v_search
        OR t.name ILIKE v_search
      )
    ORDER BY c.created_at DESC
    LIMIT LEAST(p_limit, 200)
    OFFSET p_offset;
  END IF;
END;
$$;

-- ============================================================
-- 6) insurer_get_certificate() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION insurer_get_certificate(
  p_public_id  text,
  p_ip         text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS TABLE (
  id                uuid,
  public_id         text,
  tenant_id         uuid,
  vehicle_id        uuid,
  status            text,
  customer_name     text,
  vehicle_info_json jsonb,
  content_free_text text,
  content_preset_json jsonb,
  certificate_no    text,
  service_type      text,
  service_price     integer,
  expiry_type       text,
  expiry_value      text,
  footer_variant    text,
  logo_asset_path   text,
  current_version   integer,
  created_at        timestamptz,
  updated_at        timestamptz,
  tenant_name       text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_insurer_id uuid;
  v_user_id    uuid;
  v_cert_id    uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT iu.insurer_id INTO v_insurer_id
  FROM public.insurer_users iu
  WHERE iu.user_id = v_user_id AND iu.is_active = true
  LIMIT 1;

  IF v_insurer_id IS NULL THEN
    RAISE EXCEPTION 'Not an insurer user';
  END IF;

  -- 証明書IDを取得
  SELECT c.id INTO v_cert_id
  FROM public.certificates c
  WHERE c.public_id = p_public_id
  LIMIT 1;

  -- 監査ログ
  IF v_cert_id IS NOT NULL THEN
    INSERT INTO public.insurer_access_logs (insurer_id, insurer_user_id, certificate_id, action, meta, ip, user_agent)
    VALUES (
      v_insurer_id,
      v_user_id,
      v_cert_id,
      'view',
      jsonb_build_object('public_id', p_public_id),
      p_ip,
      p_user_agent
    );
  END IF;

  RETURN QUERY
  SELECT
    c.id, c.public_id, c.tenant_id, c.vehicle_id, c.status,
    c.customer_name, c.vehicle_info_json,
    c.content_free_text, c.content_preset_json,
    c.certificate_no, c.service_type, c.service_price,
    c.expiry_type, c.expiry_value,
    c.footer_variant, c.logo_asset_path,
    c.current_version,
    c.created_at, c.updated_at,
    t.name AS tenant_name
  FROM public.certificates c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  WHERE c.public_id = p_public_id
  LIMIT 1;
END;
$$;

-- ============================================================
-- 7) insurer_audit_log() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION insurer_audit_log(
  p_action           text,
  p_target_public_id text DEFAULT NULL,
  p_query_json       jsonb DEFAULT NULL,
  p_ip               text DEFAULT NULL,
  p_user_agent       text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_insurer_id uuid;
  v_user_id    uuid;
  v_cert_id    uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT iu.insurer_id INTO v_insurer_id
  FROM public.insurer_users iu
  WHERE iu.user_id = v_user_id AND iu.is_active = true
  LIMIT 1;

  IF v_insurer_id IS NULL THEN
    RAISE EXCEPTION 'Not an insurer user';
  END IF;

  -- 証明書IDを解決
  IF p_target_public_id IS NOT NULL THEN
    SELECT c.id INTO v_cert_id
    FROM public.certificates c
    WHERE c.public_id = p_target_public_id
    LIMIT 1;
  END IF;

  INSERT INTO public.insurer_access_logs (insurer_id, insurer_user_id, certificate_id, action, meta, ip, user_agent)
  VALUES (
    v_insurer_id,
    v_user_id,
    v_cert_id,
    p_action,
    COALESCE(p_query_json, '{}'::jsonb),
    p_ip,
    p_user_agent
  );
END;
$$;

-- ============================================================
-- 8) upsert_insurer_user() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_insurer_user(
  p_insurer_id   uuid,
  p_email        text,
  p_role         text DEFAULT 'member',
  p_display_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id       uuid;
  v_insurer_user_id uuid;
BEGIN
  -- メールから auth.users の user_id を取得
  SELECT au.id INTO v_user_id
  FROM auth.users au
  WHERE au.email = LOWER(TRIM(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found for email: %', p_email;
  END IF;

  -- insurer_users に UPSERT
  INSERT INTO public.insurer_users (insurer_id, user_id, role, display_name, is_active)
  VALUES (p_insurer_id, v_user_id, p_role, p_display_name, true)
  ON CONFLICT (insurer_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    display_name = COALESCE(EXCLUDED.display_name, public.insurer_users.display_name),
    is_active = true,
    updated_at = now()
  RETURNING id INTO v_insurer_user_id;

  RETURN v_insurer_user_id;
END;
$$;

-- ============================================================
-- 9) insurer_dashboard_stats() RPC
-- ============================================================
CREATE OR REPLACE FUNCTION insurer_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_insurer_id    uuid;
  v_user_id       uuid;
  v_result        jsonb;
  v_total_views   bigint;
  v_unique_certs  bigint;
  v_month_actions bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT iu.insurer_id INTO v_insurer_id
  FROM public.insurer_users iu
  WHERE iu.user_id = v_user_id AND iu.is_active = true
  LIMIT 1;

  IF v_insurer_id IS NULL THEN
    RAISE EXCEPTION 'Not an insurer user';
  END IF;

  -- 総閲覧数
  SELECT COUNT(*) INTO v_total_views
  FROM public.insurer_access_logs
  WHERE insurer_id = v_insurer_id;

  -- ユニーク証明書数
  SELECT COUNT(DISTINCT certificate_id) INTO v_unique_certs
  FROM public.insurer_access_logs
  WHERE insurer_id = v_insurer_id
    AND certificate_id IS NOT NULL;

  -- 今月のアクション数
  SELECT COUNT(*) INTO v_month_actions
  FROM public.insurer_access_logs
  WHERE insurer_id = v_insurer_id
    AND created_at >= date_trunc('month', now());

  -- 結果を組み立て
  v_result := jsonb_build_object(
    'total_views', v_total_views,
    'unique_certs', v_unique_certs,
    'month_actions', v_month_actions
  );

  -- 直近30日の日別アクション数
  v_result := v_result || jsonb_build_object(
    'recent_activity',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(d)), '[]'::jsonb)
      FROM (
        SELECT
          ds::date AS date,
          COALESCE(cnt, 0) AS count
        FROM generate_series(
          (now() - interval '29 days')::date,
          now()::date,
          '1 day'::interval
        ) AS ds
        LEFT JOIN (
          SELECT created_at::date AS d, COUNT(*) AS cnt
          FROM public.insurer_access_logs
          WHERE insurer_id = v_insurer_id
            AND created_at >= (now() - interval '29 days')
          GROUP BY created_at::date
        ) sub ON sub.d = ds::date
        ORDER BY ds
      ) d
    )
  );

  -- アクション種別内訳
  v_result := v_result || jsonb_build_object(
    'action_breakdown',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM (
        SELECT action, COUNT(*) AS count
        FROM public.insurer_access_logs
        WHERE insurer_id = v_insurer_id
        GROUP BY action
        ORDER BY count DESC
      ) a
    )
  );

  -- 最近閲覧した証明書（直近10件）
  v_result := v_result || jsonb_build_object(
    'recent_certs',
    (
      SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (c.public_id)
          c.public_id,
          c.customer_name,
          c.status,
          c.vehicle_info_json,
          l.created_at AS viewed_at
        FROM public.insurer_access_logs l
        JOIN public.certificates c ON c.id = l.certificate_id
        WHERE l.insurer_id = v_insurer_id
          AND l.certificate_id IS NOT NULL
          AND l.action IN ('view', 'search')
        ORDER BY c.public_id, l.created_at DESC
      ) sub
      ORDER BY sub.viewed_at DESC
      LIMIT 10
    ) r
  );

  -- 案件統計（insurance_cases テーブルが存在する場合のみ）
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'insurance_cases'
  ) THEN
    v_result := v_result || jsonb_build_object(
      'case_stats',
      (
        SELECT jsonb_build_object(
          'total', COUNT(*),
          'active', COUNT(*) FILTER (WHERE ic.status IN ('submitted', 'under_review', 'info_requested')),
          'pending_review', COUNT(*) FILTER (WHERE ic.status IN ('submitted', 'under_review')),
          'info_requested', COUNT(*) FILTER (WHERE ic.status = 'info_requested'),
          'resolved', COUNT(*) FILTER (WHERE ic.status IN ('approved', 'rejected', 'closed'))
        )
        FROM public.insurance_cases ic
        WHERE ic.insurer_id = v_insurer_id
          AND ic.status != 'draft'
      )
    );

    -- 進行中の案件（active_cases）
    v_result := v_result || jsonb_build_object(
      'active_cases',
      (
        SELECT COALESCE(jsonb_agg(row_to_json(ac)), '[]'::jsonb)
        FROM (
          SELECT
            ic.id,
            ic.case_number,
            ic.title,
            ic.case_type,
            ic.status,
            t.name AS tenant_name,
            COALESCE(
              v.maker || ' ' || v.model ||
              CASE WHEN v.plate_display IS NOT NULL THEN ' ' || v.plate_display ELSE '' END,
              ''
            ) AS vehicle_summary,
            ic.submitted_at,
            ic.updated_at,
            (
              SELECT MAX(m.created_at)
              FROM public.insurance_case_messages m
              WHERE m.case_id = ic.id AND m.visibility = 'shared'
            ) AS last_message_at
          FROM public.insurance_cases ic
          LEFT JOIN public.tenants t ON t.id = ic.tenant_id
          LEFT JOIN public.vehicles v ON v.id = ic.vehicle_id
          WHERE ic.insurer_id = v_insurer_id
            AND ic.status IN ('submitted', 'under_review', 'info_requested')
          ORDER BY ic.updated_at DESC
          LIMIT 20
        ) ac
      )
    );
  ELSE
    v_result := v_result || jsonb_build_object(
      'case_stats', jsonb_build_object(
        'total', 0, 'active', 0, 'pending_review', 0,
        'info_requested', 0, 'resolved', 0
      ),
      'active_cases', '[]'::jsonb
    );
  END IF;

  RETURN v_result;
END;
$$;
