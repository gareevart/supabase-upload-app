-- Push subscriptions for Yandex Cloud Notification Service (browser push)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint_arn text not null unique,
  push_subscription jsonb not null,
  topic_subscription_arn text,
  user_agent text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_is_active_idx
  on public.push_subscriptions (is_active);

alter table public.push_subscriptions enable row level security;

-- Only the service role should read/write push subscription records.
create policy "Service role manages push subscriptions"
  on public.push_subscriptions
  for all
  using (false)
  with check (false);

comment on table public.push_subscriptions is
  'Browser push endpoints registered via Yandex Cloud Notification Service';
