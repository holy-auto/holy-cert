-- =============================================================================
-- Outbox pattern: 重要 multi-step 処理 (代理店承認 / Stripe Connect オンボード /
-- 顧客向け outbound webhook 等) を 1 トランザクションで「ビジネス結果 + イベント」
-- を記録し、別 worker (QStash cron) が後段で配送する。
--
-- これにより PostgREST がトランザクションを跨げない問題で発生していた
-- 孤立データを防ぐ。delivery 失敗は status='errored' で残り、UI で再送可能。
--
-- スコープ: tenant_id NOT NULL。RLS は service-role 専用。
-- =============================================================================

CREATE TABLE IF NOT EXISTS outbox_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  /** ビジネスドメイン分類: 'webhook' | 'agent_approval' | 'stripe_connect' | ... */
  topic           text NOT NULL CHECK (length(topic) BETWEEN 1 AND 64),
  /** イベント実体 (stable, downstream consumer が読む) */
  payload         jsonb NOT NULL,
  /** 集約ID (例: agent_id, certificate_id) — 検索/再送 UI 用 */
  aggregate_id    uuid,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'in_flight', 'delivered', 'errored', 'dead_letter')),
  attempts        int  NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  /** 最後の試行で記録された情報 (HTTP status / error message 等) */
  last_error      text,
  /** スケジュール: pending を消化する cron が `next_attempt_at <= now()` を拾う */
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 配送 worker が拾うクエリ用 index: status='pending' AND next_attempt_at <= now()
CREATE INDEX IF NOT EXISTS idx_outbox_pending_due
  ON outbox_events (next_attempt_at)
  WHERE status = 'pending';

-- テナント別の状況確認 (UI 用)
CREATE INDEX IF NOT EXISTS idx_outbox_tenant_topic
  ON outbox_events (tenant_id, topic, created_at DESC);

-- 集約 ID 検索 (再送 UI が「この agent の events を見せる」)
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate
  ON outbox_events (aggregate_id)
  WHERE aggregate_id IS NOT NULL;

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;

-- RLS: service-role のみ書き込み。テナント所有者は同テナントの行を read 可。
CREATE POLICY "outbox_events_select_own_tenant" ON outbox_events
  FOR SELECT USING (tenant_id IN (SELECT my_tenant_ids()));

CREATE TRIGGER trg_outbox_events_updated_at
  BEFORE UPDATE ON outbox_events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
