-- ============================================================
-- 受領サイン (delivery receipt) 機能 マイグレーション
--
-- 作業完了後に顧客から受領の電子署名を取得するためのフロー。
-- 既存 signature_sessions を拡張し、受領サイン専用に
-- 二要素認証 (メール + 登録電話番号下4桁) と
-- 同意文言バージョニングを追加する。
--
-- 電子署名法（平成12年法律第102号）第2条・第3条 準拠。
-- ============================================================

-- ============================================================
-- 1. signature_sessions に purpose / 二要素 / 同意関連カラムを追加
-- ============================================================
ALTER TABLE signature_sessions
  ADD COLUMN IF NOT EXISTS purpose                    text NOT NULL DEFAULT 'certificate'
    CHECK (purpose IN ('certificate', 'delivery_receipt')),
  ADD COLUMN IF NOT EXISTS secondary_factor_required  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_factor_verified  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_factor_attempts  int NOT NULL DEFAULT 0,
  -- 二要素認証用に登録時点での電話番号下4桁ハッシュを保持（証跡用）
  ADD COLUMN IF NOT EXISTS phone_last4_hash           text,
  -- 同意文言のバージョン (deliveryReceipt.ts CONSENT_VERSION と同期)
  ADD COLUMN IF NOT EXISTS consent_version            text,
  -- 顧客が同意した正規化済み文言の SHA-256 ハッシュ。
  -- 署名ペイロードにも含めるため改ざん検知の対象になる。
  ADD COLUMN IF NOT EXISTS consent_text_hash          text;

COMMENT ON COLUMN signature_sessions.purpose IS
  '署名の用途。"certificate" = 証明書本体への署名（既存）、"delivery_receipt" = 作業受領サイン。';

COMMENT ON COLUMN signature_sessions.secondary_factor_required IS
  '受領サインで二要素認証 (登録電話番号下4桁) を必須とするか。';

COMMENT ON COLUMN signature_sessions.secondary_factor_verified IS
  '二要素認証が成功したか。delivery_receipt 用途では true でなければ署名できない。';

COMMENT ON COLUMN signature_sessions.phone_last4_hash IS
  '登録時点での電話番号下4桁の SHA-256 ハッシュ (sha256(v1|tenant_id|last4|PEPPER))。'
  '顧客の入力と比較して二要素認証に使用する。';

COMMENT ON COLUMN signature_sessions.consent_version IS
  '受領サイン同意文言のバージョン文字列 (例: "delivery-receipt-v1")。';

COMMENT ON COLUMN signature_sessions.consent_text_hash IS
  '顧客が同意した正規化済み文言の SHA-256 ハッシュ。署名ペイロードに含まれる。';

-- monitoring index
CREATE INDEX IF NOT EXISTS idx_signature_sessions_purpose
  ON signature_sessions(purpose);

-- ============================================================
-- 2. signature_audit_logs.event の CHECK 制約を拡張
--    受領サイン特有のイベントを追加
-- ============================================================
ALTER TABLE signature_audit_logs DROP CONSTRAINT IF EXISTS signature_audit_logs_event_check;

ALTER TABLE signature_audit_logs
  ADD CONSTRAINT signature_audit_logs_event_check
  CHECK (event IN (
    -- 既存
    'session_created',
    'notification_sent',
    'page_opened',
    'signed',
    'verified',
    'expired',
    'cancelled',
    -- 受領サイン用
    'secondary_factor_failed',  -- 二要素認証失敗
    'secondary_factor_locked',  -- 試行回数超過でロック
    'secondary_factor_passed',  -- 二要素認証成功
    'consent_displayed',        -- 同意文言表示
    'receipt_pdf_generated',    -- 受領証 PDF 生成
    'receipt_anchored'          -- Polygon アンカリング完了
  ));

-- ============================================================
-- 3. delivery_receipts テーブル
--    受領サインのドメインモデル本体。
--    署名証跡 (signature_sessions) は再利用、
--    受領固有の情報をこちらに格納する。
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_receipts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  certificate_id           uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  -- 1 受領サイン = 1 署名セッション (1:1)
  signature_session_id     uuid UNIQUE REFERENCES signature_sessions(id) ON DELETE SET NULL,

  -- ステータス
  status                   text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed', 'expired', 'cancelled')),

  -- 受領内容のスナップショット (作業内容・日時など、後から表示・PDF 生成に使う)
  receipt_payload_json     jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- 受領証 PDF (署名済み) の Storage パス
  receipt_pdf_path         text,

  -- Polygon アンカリングのトランザクション ハッシュ (時刻・存在証明)
  anchor_tx_hash           text,
  anchored_at              timestamptz,

  -- デバイス情報 (本人性の補助証跡)
  device_fingerprint_json  jsonb,

  -- 署名完了情報
  signed_at                timestamptz,

  -- 管理
  created_by               uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT NOW(),
  updated_at               timestamptz NOT NULL DEFAULT NOW(),
  cancelled_at             timestamptz,
  cancel_reason            text
);

COMMENT ON TABLE delivery_receipts IS
  '作業完了後の受領サイン (電子署名) の管理テーブル。'
  'signature_sessions と 1:1 で紐付き、受領固有メタを格納する。';

COMMENT ON COLUMN delivery_receipts.receipt_payload_json IS
  '受領内容のスナップショット (作業日、作業内容サマリ、車両、店舗、顧客名等)。'
  '後から証明書本体が編集されても受領サイン時点の内容を保持するため固定する。';

COMMENT ON COLUMN delivery_receipts.anchor_tx_hash IS
  'Polygon (PoS) ブロックチェーンに署名ハッシュをアンカリングしたトランザクション ハッシュ。'
  '第三者によるタイムスタンプ証明として機能する。';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_delivery_receipts_tenant
  ON delivery_receipts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipts_certificate
  ON delivery_receipts(certificate_id);

CREATE INDEX IF NOT EXISTS idx_delivery_receipts_status_pending
  ON delivery_receipts(tenant_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_delivery_receipts_session
  ON delivery_receipts(signature_session_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_delivery_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delivery_receipts_updated_at ON delivery_receipts;
CREATE TRIGGER trg_delivery_receipts_updated_at
  BEFORE UPDATE ON delivery_receipts
  FOR EACH ROW EXECUTE FUNCTION update_delivery_receipts_updated_at();

-- ============================================================
-- 4. RLS ポリシー
-- ============================================================
ALTER TABLE delivery_receipts ENABLE ROW LEVEL SECURITY;

-- テナントメンバーは自テナントの受領サインのみ参照可
CREATE POLICY "delivery_receipts_tenant_select"
  ON delivery_receipts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- テナントメンバーのみ作成可
CREATE POLICY "delivery_receipts_tenant_insert"
  ON delivery_receipts FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships
      WHERE user_id = auth.uid()
    )
  );

-- 更新はサービスロール (顧客向け公開 API は service-role でアクセス) のみ
CREATE POLICY "delivery_receipts_service_update"
  ON delivery_receipts FOR UPDATE
  USING (auth.role() = 'service_role');

-- 5. certificates テーブルに受領サイン日時を追加 (顧客ポータル/オーナー画面の表示用)
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS delivery_acknowledged_at timestamptz;

COMMENT ON COLUMN certificates.delivery_acknowledged_at IS
  '顧客が受領サイン (delivery receipt) を完了した日時。'
  'NULL の場合は未受領。delivery_receipts.signed_at と連動。';
