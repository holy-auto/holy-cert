-- =============================================================
-- Polygon anchoring — per-tenant opt-out
--
-- Strategy 2026-05 アクション #2「Polygon アンカリングをデフォルト ON」
-- の実装に伴い、テナントが個別にアンカリングを停止できる
-- "opt-out" 列を tenants に追加する。
--
-- 設計:
--   - 既存の `POLYGON_ANCHOR_ENABLED` env var は **グローバル kill switch**
--     として残す (dev 環境の安全弁 + 障害時の即時停止経路)
--   - `tenants.polygon_anchor_opt_out` は **テナント単位の opt-out**:
--       false (default) → 環境変数が ON ならアンカリングする
--       true            → 環境変数が ON でもこのテナントはアンカリングしない
--   - 既存テナントは default 値で grandfather される (= anchoring 有効化)
--   - DEFAULT false = "default ON" の意図 (opt-out しない限り anchor)
--
-- See: docs/polygon-anchoring-deployment.md §テナント単位の制御
--      docs/ledra-goals-strategy-2026-05.md §9 アクション #2
-- =============================================================

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS polygon_anchor_opt_out boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN tenants.polygon_anchor_opt_out IS
  'true の場合、本テナントの新規アップロード画像 / 配達証明書名は Polygon にアンカーされない。'
  '既定値 false (= anchoring 有効) は 2026-05 戦略の「default ON」方針に対応。'
  'グローバル POLYGON_ANCHOR_ENABLED が "true" のときのみ意味を持つ。';

-- インデックスは不要 (常に tenant_id で検索する単一行 lookup のみ)。
