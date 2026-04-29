-- Generic webhook idempotency table
--
-- 背景:
--   既存の stripe_processed_events は Stripe 専用 (event_id / event_type のみ)。
--   Resend, Polygon, Square, QStash など複数プロバイダ webhook の重複処理を
--   一元管理するため、provider をキーに含む汎用テーブルを追加する。
--
-- 設計:
--   - PRIMARY KEY (provider, event_id) で「同一プロバイダ内の同じイベント」
--     を二重処理しない
--   - event_type は監視ダッシュボード用 (NULL 許容)
--   - cron/maintenance で 90 日経過行を物理削除する想定
--
-- なぜ stripe_processed_events を残すか:
--   既に多くのコードが参照しており、ALTER TABLE で renaming すると
--   migration がデプロイ順に絡むリスクが大きいため、新テーブルを追加して
--   段階的に移行する。Stripe webhook は当面そのまま既存テーブルを使う。

create table if not exists public.webhook_processed_events (
  provider    text not null,
  event_id    text not null,
  event_type  text,
  payload_hash text,
  created_at  timestamptz not null default now(),
  primary key (provider, event_id)
);

create index if not exists idx_wpe_created_at
  on public.webhook_processed_events (created_at);

comment on table public.webhook_processed_events is
  'Generic webhook idempotency. Keyed by (provider, event_id). 90+ day rows are safe to delete.';

alter table public.webhook_processed_events enable row level security;

-- service-role only (webhooks always run with service role client)
-- 既定で全 RLS ポリシーを設けないため、anon / authenticated からのアクセスは拒否される。
