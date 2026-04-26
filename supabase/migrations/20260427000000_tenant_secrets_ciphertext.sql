-- ============================================================
-- Tenant secrets at-rest encryption: STEP 1 / 3 (schema only)
--
-- 既存の平文列に加えて `*_ciphertext` 列を追加する。
-- このマイグレーションだけでは挙動は変わらず、アプリケーション側で
-- dual-write / dual-read を行う準備にすぎない。
--
-- 後続:
--   STEP 2: 既存平文を backfill して暗号化列に書き込む
--   STEP 3: 平文列を DROP する
--
-- 暗号化方式:
--   AES-256-GCM、envelope `v1.<iv_b64url>.<ciphertext_with_tag_b64url>`
--   src/lib/crypto/secretBox.ts 参照
-- ============================================================

-- LINE Messaging API (tenants 表)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS line_channel_secret_ciphertext text,
  ADD COLUMN IF NOT EXISTS line_channel_access_token_ciphertext text;

COMMENT ON COLUMN tenants.line_channel_secret_ciphertext IS
  'AES-256-GCM 暗号化された LINE channel secret. envelope: v1.<iv>.<ct+tag> (base64url). src/lib/crypto/secretBox.ts';
COMMENT ON COLUMN tenants.line_channel_access_token_ciphertext IS
  'AES-256-GCM 暗号化された LINE channel access token. envelope: v1.<iv>.<ct+tag> (base64url).';

-- Square OAuth (square_connections 表)
ALTER TABLE square_connections
  ADD COLUMN IF NOT EXISTS square_access_token_ciphertext text,
  ADD COLUMN IF NOT EXISTS square_refresh_token_ciphertext text;

COMMENT ON COLUMN square_connections.square_access_token_ciphertext IS
  'AES-256-GCM 暗号化された Square OAuth access token. envelope: v1.<iv>.<ct+tag> (base64url).';
COMMENT ON COLUMN square_connections.square_refresh_token_ciphertext IS
  'AES-256-GCM 暗号化された Square OAuth refresh token. envelope: v1.<iv>.<ct+tag> (base64url).';
