-- =============================================================
-- tenants.deactivated_at  +  会社全体の月次解約率 RPC
--
-- 目的: 透明性ダッシュボードの「月次解約率」を実データで算出する。
--   tenants には is_active(boolean) しか無く「いつ解約したか」の履歴が
--   無いため、解約時刻を記録する列とトリガを追加する。
--
-- 安全性:
--   - ADD COLUMN は nullable・DEFAULT 無し → テーブル書き換え無し
--   - 過去の解約は時刻を遡及できない。計測基盤の稼働以降のみ集計し、
--     旧来の「is_active=false かつ deactivated_at IS NULL」= 時刻不明の
--     解約は分母・分子の双方から除外して数字を歪めない
-- =============================================================

-- ① 解約時刻カラム (nullable, default なし)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;
COMMENT ON COLUMN tenants.deactivated_at IS
  '解約(is_active=false化)時刻。再有効化で NULL に戻す。トリガで自動維持。';

-- ② is_active の変化を捕捉して deactivated_at を自動維持するトリガ
--    どのコード経路・手動SQL から更新されても確実に記録されるよう、
--    アプリ側ではなく DB トリガで担保する。
create or replace function set_tenant_deactivated_at()
returns trigger
language plpgsql
as $$
begin
  if new.is_active = false and coalesce(old.is_active, true) = true then
    new.deactivated_at = now();
  elsif new.is_active = true and coalesce(old.is_active, false) = false then
    new.deactivated_at = null;
  end if;
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_tenants_deactivated_at') then
    create trigger trg_tenants_deactivated_at
      before update on tenants
      for each row execute function set_tenant_deactivated_at();
  end if;
end $$;

-- ③ 会社全体の月次解約率 (直前の「完了した月」を対象)
--    churn = その月に解約した数 ÷ その月初にアクティブだった数 × 100
create or replace function marketing_churn_stats()
returns json
language plpgsql stable security definer
set search_path = ''
as $$
declare
  result json;
  v_today date := current_date;
  v_m_start date := (date_trunc('month', v_today) - interval '1 month')::date;
  v_m_end date := date_trunc('month', v_today)::date;
  v_active_start int;
  v_churned int;
begin
  -- 先月初頭にアクティブだった母数
  -- (時刻不明の旧解約 = is_active=false かつ deactivated_at IS NULL は除外)
  select count(*) into v_active_start
  from public.tenants
  where created_at < v_m_start
    and not (is_active = false and deactivated_at is null)
    and (deactivated_at is null or deactivated_at >= v_m_start);

  -- 先月中に解約した数
  select count(*) into v_churned
  from public.tenants
  where deactivated_at >= v_m_start
    and deactivated_at < v_m_end;

  result := json_build_object(
    'monthLabel', to_char(v_m_start, 'YYYY"年"FMMM"月"'),
    'activeAtStart', v_active_start,
    'churned', v_churned,
    'ratePct', case
      when v_active_start > 0
      then round(v_churned::numeric / v_active_start::numeric * 100, 1)
      else null end,
    'measurable', v_active_start > 0
  );
  return result;
end;
$$;
