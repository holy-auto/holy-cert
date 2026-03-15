-- ============================================================
-- 保険案件管理テーブル マイグレーション
-- insurance_cases + participants + messages + attachments
-- + certificates link + events
-- ============================================================

-- ============================================================
-- 0) ヘルパー関数
-- ============================================================

-- 保険会社ユーザーかどうか判定
CREATE OR REPLACE FUNCTION is_insurer_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.insurer_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
$$;

-- 案件番号生成: IC-YYYYMMDD-NNN
CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_date text;
  v_seq  integer;
BEGIN
  v_date := to_char(now(), 'YYYYMMDD');

  SELECT COALESCE(MAX(
    NULLIF(split_part(case_number, '-', 3), '')::integer
  ), 0) + 1
  INTO v_seq
  FROM public.insurance_cases
  WHERE case_number LIKE 'IC-' || v_date || '-%';

  RETURN 'IC-' || v_date || '-' || lpad(v_seq::text, 3, '0');
END;
$$;

-- ============================================================
-- 1) insurance_cases (保険案件)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_cases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 親リレーション
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id        uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  insurer_id        uuid NOT NULL REFERENCES insurers(id) ON DELETE RESTRICT,

  -- 案件情報
  case_number       text NOT NULL DEFAULT generate_case_number(),
  case_type         text NOT NULL
                      CHECK (case_type IN (
                        'accident',
                        'vehicle_insurance',
                        'rework_check',
                        'damage_check',
                        'other'
                      )),
  title             text NOT NULL,
  description       text,
  damage_summary    text,
  admitted_at       date,

  -- ステータス
  status            text NOT NULL DEFAULT 'draft'
                      CHECK (status IN (
                        'draft',
                        'submitted',
                        'under_review',
                        'info_requested',
                        'approved',
                        'rejected',
                        'closed',
                        'cancelled'
                      )),

  -- メタ
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at      timestamptz,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ic_case_number ON insurance_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_ic_tenant ON insurance_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ic_vehicle ON insurance_cases(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_ic_insurer ON insurance_cases(insurer_id);
CREATE INDEX IF NOT EXISTS idx_ic_status ON insurance_cases(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ic_insurer_status ON insurance_cases(insurer_id, status);
CREATE INDEX IF NOT EXISTS idx_ic_created ON insurance_cases(created_at DESC);

ALTER TABLE insurance_cases ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_insurance_cases_updated_at
  BEFORE UPDATE ON insurance_cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2) insurance_case_participants (案件参加者)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_case_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id      uuid NOT NULL REFERENCES insurance_cases(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL
                 CHECK (role IN (
                   'shop_owner',
                   'shop_staff',
                   'insurer_reviewer',
                   'insurer_manager',
                   'third_party',
                   'platform_admin'
                 )),
  added_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_icp_case ON insurance_case_participants(case_id);
CREATE INDEX IF NOT EXISTS idx_icp_user ON insurance_case_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_icp_active ON insurance_case_participants(case_id, is_active)
  WHERE is_active = true;

ALTER TABLE insurance_case_participants ENABLE ROW LEVEL SECURITY;

-- 参加者判定ヘルパー関数
CREATE OR REPLACE FUNCTION is_case_participant(p_case_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.insurance_case_participants
    WHERE case_id = p_case_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- ============================================================
-- 3) insurance_case_messages (案件メッセージ)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_case_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES insurance_cases(id) ON DELETE CASCADE,
  sender_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  visibility    text NOT NULL DEFAULT 'shared'
                  CHECK (visibility IN ('shared', 'internal')),
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_icm_case ON insurance_case_messages(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_icm_sender ON insurance_case_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_icm_visibility ON insurance_case_messages(case_id, visibility);

ALTER TABLE insurance_case_messages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_insurance_case_messages_updated_at
  BEFORE UPDATE ON insurance_case_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- DB トリガー: 保険会社ユーザーの visibility を shared に強制
CREATE OR REPLACE FUNCTION enforce_insurer_message_visibility()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.insurer_users
    WHERE user_id = NEW.sender_id AND is_active = true
  ) THEN
    NEW.visibility := 'shared';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_insurer_visibility
  BEFORE INSERT ON insurance_case_messages
  FOR EACH ROW EXECUTE FUNCTION enforce_insurer_message_visibility();

-- ============================================================
-- 4) insurance_case_attachments (案件添付ファイル)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_case_attachments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES insurance_cases(id) ON DELETE CASCADE,
  message_id      uuid REFERENCES insurance_case_messages(id) ON DELETE SET NULL,
  uploaded_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_path    text NOT NULL,
  file_name       text NOT NULL,
  content_type    text,
  file_size       bigint DEFAULT 0,
  visibility      text NOT NULL DEFAULT 'shared'
                    CHECK (visibility IN ('shared', 'internal')),
  category        text NOT NULL DEFAULT 'other'
                    CHECK (category IN (
                      'damage_photo',
                      'estimate',
                      'certificate',
                      'inspection_report',
                      'invoice',
                      'other'
                    )),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ica_case ON insurance_case_attachments(case_id);
CREATE INDEX IF NOT EXISTS idx_ica_message ON insurance_case_attachments(message_id)
  WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ica_visibility ON insurance_case_attachments(case_id, visibility);

ALTER TABLE insurance_case_attachments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5) insurance_case_certificates (案件・証明書リンク)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_case_certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES insurance_cases(id) ON DELETE CASCADE,
  certificate_id  uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  linked_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_icc_case ON insurance_case_certificates(case_id);
CREATE INDEX IF NOT EXISTS idx_icc_cert ON insurance_case_certificates(certificate_id);

ALTER TABLE insurance_case_certificates ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6) insurance_case_events (案件イベントログ)
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_case_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES insurance_cases(id) ON DELETE CASCADE,
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    text NOT NULL
                  CHECK (event_type IN (
                    'created',
                    'submitted',
                    'status_changed',
                    'message_sent',
                    'attachment_uploaded',
                    'certificate_linked',
                    'participant_added',
                    'participant_removed',
                    'viewed'
                  )),
  detail        jsonb DEFAULT '{}'::jsonb,
  ip            text,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ice_case ON insurance_case_events(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ice_type ON insurance_case_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ice_actor ON insurance_case_events(actor_id);

ALTER TABLE insurance_case_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7) Storage バケット
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('insurance-cases', 'insurance-cases', false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 8) RLS ポリシー
-- ============================================================

-- === insurance_cases ===

-- 施工店: 自テナントの案件を閲覧
CREATE POLICY "ic_shop_select" ON insurance_cases
  FOR SELECT USING (
    tenant_id IN (SELECT my_tenant_ids())
  );

-- 保険会社: 自社宛の案件を閲覧（draft は除外）
CREATE POLICY "ic_insurer_select" ON insurance_cases
  FOR SELECT USING (
    insurer_id = my_insurer_id()
    AND status != 'draft'
  );

-- 施工店: 案件作成
CREATE POLICY "ic_shop_insert" ON insurance_cases
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT my_tenant_ids())
  );

-- 施工店: 自テナントの案件を更新
CREATE POLICY "ic_shop_update" ON insurance_cases
  FOR UPDATE USING (
    tenant_id IN (SELECT my_tenant_ids())
  );

-- 保険会社: 自社宛の案件ステータスを更新
CREATE POLICY "ic_insurer_update" ON insurance_cases
  FOR UPDATE USING (
    insurer_id = my_insurer_id()
    AND status != 'draft'
  );

-- === insurance_case_participants ===

-- 案件参加者: 参加者リストを閲覧
CREATE POLICY "icp_select" ON insurance_case_participants
  FOR SELECT USING (
    is_case_participant(case_id)
  );

-- 施工店: 参加者追加
CREATE POLICY "icp_shop_insert" ON insurance_case_participants
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM insurance_cases
      WHERE tenant_id IN (SELECT my_tenant_ids())
    )
  );

-- 施工店: 参加者の is_active 更新
CREATE POLICY "icp_shop_update" ON insurance_case_participants
  FOR UPDATE USING (
    case_id IN (
      SELECT id FROM insurance_cases
      WHERE tenant_id IN (SELECT my_tenant_ids())
    )
  );

-- === insurance_case_messages ===

-- 施工店参加者: shared + internal 両方見える
CREATE POLICY "icm_shop_select" ON insurance_case_messages
  FOR SELECT USING (
    is_case_participant(case_id)
    AND NOT is_insurer_user()
  );

-- 保険会社参加者: shared のみ見える
CREATE POLICY "icm_insurer_select" ON insurance_case_messages
  FOR SELECT USING (
    is_case_participant(case_id)
    AND is_insurer_user()
    AND visibility = 'shared'
  );

-- 参加者: メッセージ送信（sender_id = 自分のみ）
CREATE POLICY "icm_insert" ON insurance_case_messages
  FOR INSERT WITH CHECK (
    is_case_participant(case_id)
    AND sender_id = auth.uid()
  );

-- === insurance_case_attachments ===

-- 施工店参加者: shared + internal 両方
CREATE POLICY "ica_shop_select" ON insurance_case_attachments
  FOR SELECT USING (
    is_case_participant(case_id)
    AND NOT is_insurer_user()
  );

-- 保険会社参加者: shared のみ
CREATE POLICY "ica_insurer_select" ON insurance_case_attachments
  FOR SELECT USING (
    is_case_participant(case_id)
    AND is_insurer_user()
    AND visibility = 'shared'
  );

-- 参加者: アップロード
CREATE POLICY "ica_insert" ON insurance_case_attachments
  FOR INSERT WITH CHECK (
    is_case_participant(case_id)
    AND uploaded_by = auth.uid()
  );

-- === insurance_case_certificates ===

-- 参加者: リンク済み証明書を閲覧
CREATE POLICY "icc_select" ON insurance_case_certificates
  FOR SELECT USING (
    is_case_participant(case_id)
  );

-- 施工店: 証明書リンク追加
CREATE POLICY "icc_shop_insert" ON insurance_case_certificates
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM insurance_cases
      WHERE tenant_id IN (SELECT my_tenant_ids())
    )
  );

-- === insurance_case_events ===

-- 参加者: イベントログを閲覧
CREATE POLICY "ice_select" ON insurance_case_events
  FOR SELECT USING (
    is_case_participant(case_id)
  );

-- 参加者: イベントログを追加（append-only）
CREATE POLICY "ice_insert" ON insurance_case_events
  FOR INSERT WITH CHECK (
    is_case_participant(case_id)
  );

-- ============================================================
-- 9) 証明書テーブルに保険会社向け RLS 追加
-- ============================================================

-- 保険会社: 案件にリンクされた証明書のみ閲覧可能
CREATE POLICY "certs_insurer_via_case" ON certificates
  FOR SELECT USING (
    id IN (
      SELECT certificate_id FROM insurance_case_certificates icc
      JOIN insurance_cases ic ON ic.id = icc.case_id
      WHERE ic.insurer_id = my_insurer_id()
        AND ic.status != 'draft'
    )
  );
