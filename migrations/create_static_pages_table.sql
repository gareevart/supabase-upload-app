-- Static pages for admin/editor managed website pages
create table if not exists public.static_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null,
  featured_image text,
  published boolean not null default false,
  is_homepage boolean not null default false,
  author_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint static_pages_slug_format check (slug ~ '^[a-z0-9-]+$')
);

create unique index if not exists static_pages_single_homepage_idx
on public.static_pages (is_homepage)
where is_homepage = true;

create index if not exists static_pages_author_id_idx on public.static_pages(author_id);
create index if not exists static_pages_published_idx on public.static_pages(published);

alter table public.static_pages enable row level security;

drop policy if exists "Public can read published static pages" on public.static_pages;
create policy "Public can read published static pages"
on public.static_pages
for select
using (published = true);

drop policy if exists "Authenticated can create static pages" on public.static_pages;
create policy "Authenticated can create static pages"
on public.static_pages
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Authors can update own static pages" on public.static_pages;
create policy "Authors can update own static pages"
on public.static_pages
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "Authors can delete own static pages" on public.static_pages;
create policy "Authors can delete own static pages"
on public.static_pages
for delete
to authenticated
using (auth.uid() = author_id);
