-- Playground budget, owned and enforced by the server. Never stores source.
begin;
create table public.playground_quota (
  singleton boolean primary key default true check (singleton),
  preview_enabled boolean not null default false,
  production_enabled boolean not null default false
);
create table public.playground_runs (
  run_id uuid primary key,
  user_id uuid not null,
  created_at timestamptz not null,
  lease_until timestamptz not null,
  charged_seconds integer not null check (charged_seconds between 1 and 600),
  closed_at timestamptz
);
create index playground_runs_created_idx on public.playground_runs(created_at);
alter table public.playground_quota enable row level security;
alter table public.playground_runs enable row level security;
revoke all on public.playground_quota, public.playground_runs from public, anon, authenticated;
grant select, update on public.playground_quota to service_role;
grant select, insert, update, delete on public.playground_runs to service_role;
insert into public.playground_quota default values;

create function public.playground_budget(p_environment text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'enabled', case p_environment
      when 'production' then q.production_enabled
      when 'preview' then q.preview_enabled
      else false end,
    'remainingSeconds', greatest(0, 18000 - coalesce(sum(r.charged_seconds), 0)),
    'totalSeconds', 18000,
    'remainingStarts', greatest(0, 10 - count(*) filter (
      where r.created_at >= (date_trunc('day', timezone('utc', now())) at time zone 'UTC')
    )),
    'dailyStarts', 10,
    'active', coalesce(bool_or(r.closed_at is null and r.lease_until > now()), false),
    'dailyResetAt', ((date_trunc('day', timezone('utc', now())) + interval '1 day') at time zone 'UTC')
  )
  from public.playground_quota q
  left join public.playground_runs r on r.created_at >= now() - interval '30 days 13 minutes'
  where q.singleton
  group by q.production_enabled, q.preview_enabled;
$$;

create function public.reserve_playground(p_environment text, p_user_id uuid, p_run_id uuid, p_seconds integer)
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
  if (budget->>'remainingStarts')::integer < 1 then return 'daily'; end if;
  if (budget->>'remainingSeconds')::integer < p_seconds then return 'time'; end if;

  delete from public.playground_runs where created_at < now() - interval '31 days';
  insert into public.playground_runs (run_id, user_id, created_at, lease_until, charged_seconds)
    values (p_run_id, p_user_id, now(), now() + make_interval(secs => p_seconds + 180), p_seconds);
  return 'reserved';
end;
$$;

create function public.owns_playground(p_user_id uuid, p_run_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.playground_runs
    where user_id = p_user_id and run_id = p_run_id and closed_at is null and lease_until > now()
  );
$$;

create function public.release_playground(p_user_id uuid, p_run_id uuid, p_refund boolean)
returns boolean language sql set search_path = '' as $$
  with released as (
    update public.playground_runs
       set closed_at = now(),
           charged_seconds = case when p_refund
             then least(charged_seconds, greatest(1, ceil(extract(epoch from (now() - created_at)))::integer))
             else charged_seconds end
     where user_id = p_user_id and run_id = p_run_id and closed_at is null
    returning 1
  )
  select exists(select 1 from released);
$$;

revoke all on function public.playground_budget(text) from public, anon, authenticated;
revoke all on function public.reserve_playground(text, uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.owns_playground(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_playground(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.playground_budget(text) to service_role;
grant execute on function public.reserve_playground(text, uuid, uuid, integer) to service_role;
grant execute on function public.owns_playground(uuid, uuid) to service_role;
grant execute on function public.release_playground(uuid, uuid, boolean) to service_role;
commit;
