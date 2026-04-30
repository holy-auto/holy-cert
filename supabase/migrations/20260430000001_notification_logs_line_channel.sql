-- notification_logs: LINE 配信チャネル対応
--
-- 背景:
--   既存の `notification_logs` は `recipient_email` のみで配信先を記録していた。
--   メンテナンスリマインダーが LINE Push 配信に対応するにあたり、どのチャネル
--   で送ったか / どの LINE user に送ったかを後追い可能にする必要がある。
--
-- 設計:
--   - channel text DEFAULT 'email' CHECK (channel IN ('email','line'))
--     既存行は全て 'email' で発信していたため、default で互換性を担保。
--   - recipient_line_user_id text NULL 許容
--     LINE 配信時のみ詰める。email チャネル時は NULL のまま。
--   - cron の冪等チェックは依然として (target_id, type) で動くため、channel が
--     混在しても重複送信は起きない。チャネル切替は「次回配信から」反映される。
--
-- 互換性:
--   - 既存テーブルに ALTER ADD COLUMN ... DEFAULT (PG11+ instant op)。
--   - CHECK 制約は NOT VALID で追加し、既存行は default で 'email' に
--     なっているため後段の VALIDATE は不要。

alter table public.notification_logs
  add column if not exists channel text not null default 'email';

alter table public.notification_logs
  add column if not exists recipient_line_user_id text;

-- channel の値域制約 (NOT VALID で既存行をスキャンしない / default 適用済みなので
-- 実質的に全行 'email')
alter table public.notification_logs
  drop constraint if exists notification_logs_channel_check;

alter table public.notification_logs
  add constraint notification_logs_channel_check
  check (channel in ('email', 'line'))
  not valid;

alter table public.notification_logs
  validate constraint notification_logs_channel_check;

comment on column public.notification_logs.channel is
  '配信チャネル。email = Resend 経由メール / line = LINE Messaging API Push。';
comment on column public.notification_logs.recipient_line_user_id is
  'LINE 配信時の宛先 LINE user ID。email チャネル時は NULL。';
