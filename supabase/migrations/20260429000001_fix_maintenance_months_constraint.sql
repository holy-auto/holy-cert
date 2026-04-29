-- Re-apply maintenance_reminder_months constraint cleanly.
--
-- 背景:
--   先行マイグレーション 20260429000000_follow_up_maintenance_reminders.sql の
--   初版が CHECK 内で `array(select generate_series(...))` を使っており、
--   PostgreSQL の "cannot use subquery in check constraint" (0A000) で失敗。
--   修正後の同ファイルでも、tooling 側で「適用済み」と記録されてしまった
--   ケースに備えて、本ファイルでベキ等に再適用する。
--
-- 冪等性:
--   - 関数は CREATE OR REPLACE
--   - 制約は DROP IF EXISTS → ADD
--   - ALTER ADD COLUMN IF NOT EXISTS で列の存在を保証

alter table public.follow_up_settings
  add column if not exists maintenance_reminder_months int[] not null default '{6,12}';

create or replace function public.follow_up_maintenance_months_valid(arr int[])
returns boolean
language sql
immutable
as $$
  select coalesce(array_length(arr, 1), 0) = 0
    or not exists (
      select 1 from unnest(arr) as x where x is null or x < 1 or x > 120
    );
$$;

alter table public.follow_up_settings
  drop constraint if exists follow_up_settings_maintenance_months_range;

alter table public.follow_up_settings
  add constraint follow_up_settings_maintenance_months_range
  check (public.follow_up_maintenance_months_valid(maintenance_reminder_months));
