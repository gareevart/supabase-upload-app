-- Blog performance indexes.
-- Run this in the Supabase SQL editor (DDL cannot be applied from the app client).
--
-- Covers the hot paths after the ISR/RSC refactor:
--   * detail page + generateStaticParams: lookup by slug, filter by published
--   * list page: filter by published, order by created_at desc, filter by author
--   * search: ilike on title / excerpt (trigram), content scan

-- Trigram support for fast ILIKE on title/excerpt.
create extension if not exists pg_trgm;

-- Detail page: WHERE slug = $1 AND published = true
create index if not exists idx_blog_posts_slug
  on public.blog_posts (slug);

-- List page: WHERE published = true ORDER BY created_at DESC
create index if not exists idx_blog_posts_published_created_at
  on public.blog_posts (published, created_at desc);

-- "My posts" / drafts filter: WHERE author_id = $1
create index if not exists idx_blog_posts_author_id
  on public.blog_posts (author_id);

-- Search: ILIKE %q% on title / excerpt.
create index if not exists idx_blog_posts_title_trgm
  on public.blog_posts using gin (title gin_trgm_ops);
create index if not exists idx_blog_posts_excerpt_trgm
  on public.blog_posts using gin (excerpt gin_trgm_ops);

-- Optional: declare the author_id -> profiles.id relationship so PostgREST can
-- embed authors in a single query (currently fetched separately because no FK
-- is registered). Only run if profiles.id is the intended target and the data
-- is already consistent.
--
-- alter table public.blog_posts
--   add constraint blog_posts_author_id_fkey
--   foreign key (author_id) references public.profiles (id);
