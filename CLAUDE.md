# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server with Turbopack
npm run build        # Production build (NODE_OPTIONS='--no-deprecation' next build)
npm run lint         # ESLint
npm run test         # Jest
npm run test:watch   # Jest in watch mode
npm run test:coverage
npm run diagnose     # tsx scripts/test-broadcasts-access.ts
npm run sync:embeddings  # tsx scripts/sync-embeddings.ts
```

## Architecture

This is a Next.js App Router project following **Feature-Sliced Design (FSD)**. The layer hierarchy (high → low, imports only go downward):

```
app/          → routes, pages, providers, root layout
widgets/      → large composed page sections (no domain logic)
features/     → user-facing features and business logic
entities/     → domain model entities
shared/       → reusable UI, API clients, utils, types
```

`lib/` holds server-side utilities (Supabase admin, Redis, Yandex APIs, document parsing) used by API routes. `hooks/` holds client-side React hooks.

**Key architectural rules:**
- Keep `app/**/page.tsx` thin — compose from widgets/features/shared.
- Business logic belongs in `features/*/model/use*.ts` hooks, not in UI components.
- Widget pattern: `features/<name>/model/use<Name>.ts` + `features/<name>/ui/<Name>Panel.tsx` → composed at `widgets/<name>/ui/<Name>Widget.tsx`.

## Internationalisation (i18n)

All user-visible strings **must** be provided in both English and Russian. Never hardcode UI text.

**Convention:**
- Translation files live next to the component: `ComponentName.i18n/en.json` and `ComponentName.i18n/ru.json`.
- Import both files and register them in `app/contexts/I18nContext.tsx` (`enTranslations` / `ruTranslations` spreads).
- Use the `useI18n()` hook inside client components: `const { t } = useI18n(); ... t('key')`.
- Keys must be unique across the whole app (prefix with component name, e.g. `"blogEditor.saveButton"`).

**Example file pair:**
```json
// BlogEditor.i18n/en.json
{ "blogEditor.saveButton": "Save", "blogEditor.title": "New post" }

// BlogEditor.i18n/ru.json
{ "blogEditor.saveButton": "Сохранить", "blogEditor.title": "Новый пост" }
```

This rule applies to every new page, widget, feature, and entity component.

## UI and Styling

- **Use Gravity UI exclusively** (`@gravity-ui/uikit`, `@gravity-ui/icons`) for all new UI components and icons. Do not introduce other UI/icon libraries.
- **Do not add Tailwind utility classes** to new pages, widgets, or features. Tailwind exists in legacy code only.
- Design tokens live in `styles/globals.css` (spacing, radii, base tokens) and `styles/styles.css` (theme palette overrides). Always use CSS variables instead of hardcoded colors, spacing, or radii.
- Component styles go in local `Component.css` files co-located with the component, using BEM-like naming with the component prefix.
- Maintain dark/light theme compatibility (`g-root_theme_light` / `g-root_theme_dark`).
- Use `@/` path alias for all imports (configured in `tsconfig.json`).

## Figma MCP Workflow

When implementing Figma designs, always follow this sequence:
1. `get_design_context` for the target node(s).
2. If response is too large, run `get_metadata` then `get_design_context` on specific nodes only.
3. `get_screenshot` for visual validation.
4. Implement using repository conventions (Gravity UI + FSD + existing tokens).
5. Validate 1:1 against the screenshot before marking work done.

If Figma MCP returns localhost asset URLs, use them directly. Store design assets under `public/figma/` grouped by feature.

## Backend Services

- **Supabase** — auth, PostgreSQL, storage. Client-side uses `@supabase/ssr` cookie-based session; server-side API routes use service role key for RLS bypass.
- **Yandex Cloud** — GPT (streaming LLM), Vision API (OCR + classification for chat image attachments), Yandex Search, Yandex Object Storage (S3-compatible, used for all file/image uploads).
- **Redis** — caches blog post lists (120s TTL). Keys are invalidated on post create/update/delete via `redisDeleteByPrefix()`.
- **Resend** — transactional email for the broadcasting system.

Auth middleware in API routes: `withAuth()` supports both Supabase session cookies and Bearer API keys (`sk_[64-hex-chars]`), validated via the `validate_api_key` RPC function.

## Key Data Flows

**Chat:** Messages stored in Supabase → user sends text + optional file → `/api/generate-text-stream` streams Yandex GPT response → image attachments go through `/api/analyze-image` (Yandex Vision OCR).

**Blog posts:** TipTap JSON → `POST /api/blog-posts` → featured image data URLs uploaded to Yandex S3 → content stored in `blog_posts` table → Redis cache invalidated → embeddings synced for search.

**File uploads:** Client `FileUpload` component → images compressed via Sharp, PDFs parsed via pdf2json → uploaded to Yandex Object Storage → metadata stored in `images` table.

## Environment Variables

Required in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase (bypasses RLS) |
| `YANDEX_API_KEY`, `YANDEX_FOLDER_ID` | Yandex Vision API |
| `YANDEX_CLOUD_API_KEY`, `YANDEX_CLOUD_FOLDER`, `YANDEX_CLOUD_MODEL` | Yandex GPT |
| `SEARCH_API_YANDEX_FOLDER`, `SEARCH_API_KEY_ID`, `SEARCH_API_KEY` | Yandex Search |
| `BUCKET_KEY_ID`, `BUCKET_SECRET_KEY`, `ENDPOINT_URL` | Yandex Object Storage (server) |
| `NEXT_PUBLIC_BUCKET_KEY_ID`, `NEXT_PUBLIC_BUCKET_SECRET_KEY`, `NEXT_PUBLIC_ENDPOINT_URL` | Yandex Object Storage (client) |
| `REDIS_URL` | Redis |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Email sending |
| `CRON_SECRET` | Cron job auth |
