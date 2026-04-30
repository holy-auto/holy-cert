-- Customer AI summary cache
--
-- 背景:
--   /admin/customers/[id] の Phase 2 で deriveSignals の出力を LLM に投げて
--   サマリ文を生成する。ページを開くたびに Anthropic を呼ぶとコストが
--   爆発するので、signals のハッシュをキーにキャッシュする。
--
-- 設計:
--   - customer 1 件につき 1 行 (PK = customer_id)
--   - signals_hash が変わるか generated_at が古い (TTL 24h) ときのみ再生成
--   - tenant_id は RLS のためにも持たせておく
--   - summary は短文 (1〜2 文 / ~200 文字以内) を想定
--
-- RLS:
--   - 同一テナントのメンバのみ SELECT 可
--   - INSERT / UPDATE は service-role 経由 (cron / API ルート) でのみ行う

create table if not exists public.customer_ai_summaries (
  customer_id uuid primary key references public.customers (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  signals_hash text not null,
  summary text not null,
  generated_at timestamptz not null default now()
);

create index if not exists idx_customer_ai_summaries_tenant
  on public.customer_ai_summaries (tenant_id);

alter table public.customer_ai_summaries enable row level security;

drop policy if exists customer_ai_summaries_tenant_select on public.customer_ai_summaries;
create policy customer_ai_summaries_tenant_select on public.customer_ai_summaries
  for select using (
    tenant_id in (select tenant_id from public.tenant_memberships where user_id = auth.uid())
  );

comment on table public.customer_ai_summaries is
  '顧客 360° ビューの AI サマリキャッシュ。signals_hash が変わるか TTL 切れで再生成する。';
comment on column public.customer_ai_summaries.signals_hash is
  'derive された signals の安定ハッシュ。変化検知 + キャッシュキー兼用。';
comment on column public.customer_ai_summaries.summary is
  'LLM が生成した 1〜2 文のサマリ。失敗時は行が存在しない (UI は signals だけで動く)。';
