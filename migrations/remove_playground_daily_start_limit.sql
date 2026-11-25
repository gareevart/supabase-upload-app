-- Apply after create_playground_quota.sql. Keep existing function permissions,
-- rollout switches, runtime accounting and previously recorded usage.
create or replace function public.playground_budget(p_environment text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'enabled', case p_environment
      when 'production' then q.production_enabled
      when 'preview' then q.preview_enabled
      else false end,
    'remainingSeconds', greatest(0, 18000 - coalesce(sum(r.charged_seconds), 0)),
    'totalSeconds', 18000,
    -- Old deployments require positive values for these legacy fields. They are
    -- compatibility placeholders until those deployments are retired, not quotas.
    'remainingStarts', 10,
    'dailyStarts', 10,
    'active', coalesce(bool_or(r.closed_at is null and r.lease_until > now()), false),
    'dailyResetAt', ((date_trunc('day', timezone('utc', now())) + interval '1 day') at time zone 'UTC')
  )
  from public.playground_quota q
  left join public.playground_runs r on r.created_at >= now() - interval '30 days 13 minutes'
  where q.singleton
  group by q.production_enabled, q.preview_enabled;
$$;

create or replace function public.reserve_playground(p_environment text, p_user_id uuid, p_run_id uuid, p_seconds integer)
returns text language plpgsql set search_path = '' as $$
declare
  budget jsonb;
begin
  if p_user_id is null or p_run_id is null or p_seconds is null or p_seconds not in (30, 600)
    then return 'invalid'; end if;
  -- Serialize reservations across deployments and users. There is only one worldwide slot.
  perform 1 from public.playground_quota where singleton for update;
  if not found then return 'disabled'; end if;
  budget := public.playground_budget(p_environment);
  if not coalesce((budget->>'enabled')::boolean, false) then return 'disabled'; end if;
  if (budget->>'active')::boolean then return 'busy'; end if;
  if (budget->>'remainingSeconds')::integer < p_seconds then return 'time'; end if;

  delete from public.playground_runs where created_at < now() - interval '31 days';
  insert into public.playground_runs (run_id, user_id, created_at, lease_until, charged_seconds)
    values (p_run_id, p_user_id, now(), now() + make_interval(secs => p_seconds + 180), p_seconds);
  return 'reserved';
end;
$$;
