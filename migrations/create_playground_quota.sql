-- Global, deployment-independent beta quota. No submitted source is stored here.
begin;
create table public.playground_quota (
  singleton boolean primary key default true check (singleton),
  day_utc date not null default (timezone('utc', now()))::date,
  starts smallint not null default 0 check (starts between 0 and 10),
  run_id uuid,
  user_id uuid,
  lease_until timestamptz
);
alter table public.playground_quota enable row level security;
revoke all on public.playground_quota from public, anon, authenticated;
grant select, update on public.playground_quota to service_role;
insert into public.playground_quota default values;

create function public.reserve_playground(p_user_id uuid, p_run_id uuid)
returns boolean language sql set search_path = '' as $$
  with reserved as (
    update public.playground_quota
       set starts = case when day_utc = timezone('utc', now())::date then starts + 1 else 1 end,
           day_utc = timezone('utc', now())::date,
           user_id = p_user_id,
           run_id = p_run_id,
           lease_until = now() + interval '13 minutes'
     where singleton
       and (lease_until is null or lease_until <= now())
       and (day_utc <> timezone('utc', now())::date or starts < 10)
    returning 1
  )
  select exists(select 1 from reserved);
$$;

create function public.owns_playground(p_user_id uuid, p_run_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.playground_quota
     where singleton and user_id = p_user_id and run_id = p_run_id and lease_until > now()
  );
$$;

create function public.release_playground(p_user_id uuid, p_run_id uuid)
returns boolean language sql set search_path = '' as $$
  with released as (
    update public.playground_quota
       set run_id = null, user_id = null, lease_until = null
     where singleton and user_id = p_user_id and run_id = p_run_id
    returning 1
  )
  select exists(select 1 from released);
$$;

revoke all on function public.reserve_playground(uuid, uuid) from public, anon, authenticated;
revoke all on function public.owns_playground(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_playground(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reserve_playground(uuid, uuid) to service_role;
grant execute on function public.owns_playground(uuid, uuid) to service_role;
grant execute on function public.release_playground(uuid, uuid) to service_role;
commit;
