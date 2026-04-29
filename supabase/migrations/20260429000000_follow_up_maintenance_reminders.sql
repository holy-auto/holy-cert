-- Maintenance reminders (6 / 12 month anniversaries)
--
-- 背景:
--   既存の `follow_up_days_after`（既定 [90, 180]）は施工後の日数で
--   発火する recoat 提案系トリガー。一方で「車両のメンテナンスタイミング
--   (6/12 ヶ月点検)」という意味合いのリマインドは、月単位で発火させたほうが
--   顧客の体験に合う（毎月同じ日付になる）。
--
--   feature gap (audit_report_20260329 §12.3): 6/12 ヶ月のメンテナンス
--   リマインダーが follow-up cron で未対応だったので、専用の月配列を
--   持たせて分離する。
--
-- 設計:
--   - 既定値 {6, 12}: 半年点検 + 1 年点検
--   - 空配列にすると当機能を無効化できる
--   - 0 は不可（発行直後トリガーは別途 send_on_issue で表現）
--   - cron は notification_logs.type = 'maintenance_reminder_<n>m' で
--     冪等性を担保する
--
-- 既存行への影響:
--   ALTER ... ADD COLUMN ... DEFAULT '{6,12}' は PostgreSQL 11+ で
--   instant operation (テーブル書き換え不要)。zero-downtime 安全。

alter table public.follow_up_settings
  add column if not exists maintenance_reminder_months int[] not null default '{6,12}';

comment on column public.follow_up_settings.maintenance_reminder_months is
  'Anniversary months (1-based) at which to send maintenance reminder email. Empty array disables. Default {6, 12}.';

-- Sanity check: only positive integers in 1..120 (allow up to 10 years).
--
-- PostgreSQL does NOT allow subqueries inside CHECK constraints, so we
-- can't use `<@ array(select generate_series(...))`. Instead we expose
-- an IMMUTABLE function that validates the array element-wise and call
-- it from the CHECK. IMMUTABLE function calls are permitted because the
-- planner can evaluate them deterministically per row.
create or replace function public.follow_up_maintenance_months_valid(arr int[])
returns boolean
language sql
immutable
as $$
  -- empty array: feature disabled, treat as valid
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
