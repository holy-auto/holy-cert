-- Fix agent_dashboard_stats RPC to include id/contact_name in recent_referrals
-- and rename fields to match frontend expectations.
create or replace function agent_dashboard_stats(p_agent_id uuid)
returns jsonb
language plpgsql stable security definer
as $$
declare
  v_result jsonb;
begin
  -- Verify caller is an active agent user for this agent
  if not exists (
    select 1 from agent_users
    where user_id = auth.uid()
      and agent_id = p_agent_id
      and is_active = true
  ) then
    raise exception 'Not an active agent user';
  end if;

  select jsonb_build_object(
    'total_referrals', (
      select count(*) from agent_referrals where agent_id = p_agent_id
    ),
    'pending_referrals', (
      select count(*) from agent_referrals where agent_id = p_agent_id and status = 'pending'
    ),
    'contracted_referrals', (
      select count(*) from agent_referrals where agent_id = p_agent_id and status = 'contracted'
    ),
    'in_negotiation_referrals', (
      select count(*) from agent_referrals where agent_id = p_agent_id and status = 'in_negotiation'
    ),
    'trial_referrals', (
      select count(*) from agent_referrals where agent_id = p_agent_id and status = 'trial'
    ),
    'total_commission_amount', (
      select coalesce(sum(amount), 0) from agent_commissions where agent_id = p_agent_id and status in ('approved', 'paid')
    ),
    'pending_commission_amount', (
      select coalesce(sum(amount), 0) from agent_commissions where agent_id = p_agent_id and status = 'pending'
    ),
    'paid_commission_amount', (
      select coalesce(sum(amount), 0) from agent_commissions where agent_id = p_agent_id and status = 'paid'
    ),
    'this_month_commissions', (
      select coalesce(sum(amount), 0) from agent_commissions
      where agent_id = p_agent_id
        and status in ('pending', 'approved', 'paid')
        and period_start >= date_trunc('month', current_date)
    ),
    'conversion_rate', (
      select case
        when count(*) = 0 then 0
        else round(count(*) filter (where status = 'contracted')::numeric / count(*)::numeric * 100, 1)
      end
      from agent_referrals where agent_id = p_agent_id
    ),
    'recent_referrals', (
      select coalesce(jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc), '[]'::jsonb)
      from (
        select id, shop_name, contact_name, status, created_at
        from agent_referrals
        where agent_id = p_agent_id
        order by created_at desc
        limit 5
      ) r
    ),
    'monthly_commissions', (
      select coalesce(jsonb_agg(row_to_json(m)::jsonb order by m.month), '[]'::jsonb)
      from (
        select
          to_char(period_start, 'YYYY-MM') as month,
          sum(amount) as total
        from agent_commissions
        where agent_id = p_agent_id
          and status in ('approved', 'paid')
          and period_start >= current_date - interval '6 months'
        group by to_char(period_start, 'YYYY-MM')
      ) m
    ),
    'unread_announcements', (
      select count(*)
      from agent_announcements aa
      where aa.published_at is not null
        and aa.published_at <= now()
        and not exists (
          select 1 from agent_announcement_reads aar
          where aar.announcement_id = aa.id
            and aar.user_id = auth.uid()
        )
    )
  ) into v_result;

  return v_result;
end;
$$;
