# Cloud Playground beta

Route: `/playground`. Not linked from public navigation yet. Run access is disabled by default. The site functions only orchestrate; they do not evaluate user code.

## Setup

1. Apply `migrations/create_playground_quota.sql` in the target Supabase environment. The RPCs and the singleton lease are service-role-only. Check that anonymous and authenticated callers cannot invoke the RPCs.
2. Make sure Sandbox and Vercel OIDC are available for the target project. For local smoke tests, link the correct Vercel project and use `vercel env pull` (OIDC tokens expire). Keep all deployment credentials server-side; never pass them to a VM.
3. Set the server-only `PLAYGROUND_ALLOWED_USER_IDS` environment variable to comma-separated Supabase Auth user IDs for invited testers. Set it only in the test/preview environment first. Existing Supabase URL, anon key, and service-role key must point to the same environment. No extra Sandbox token is needed on Vercel with OIDC.
4. Redeploy that environment. Sign in with an invited account. Verify unauthorized, non-invited, and cross-origin requests cannot consume the quota.

## Smoke test

- In **Workspace**, create `example.js`, `example.ts`, and `example.py` using **New file**. Try `console.log(2 + 2)`, `const value: number = 4; console.log(value)`, and `print(2 + 2)`. Run each selected file and verify that the output says 4, the chosen filename and exit code 0. Files in the same workspace can import siblings via an explicit relative path in JavaScript/TypeScript or normal Python imports.
- Reload the same tab and check the active file and edits are restored. Workspace drafts live only in browser session storage for up to one hour; the VM discards its copy after each run. Script mode allows up to 20 flat .js/.ts/.py files and 64 KiB total. Node 24 runs JavaScript as ESM and strips/transforms TypeScript syntax without type checking. Python uses the managed Python image. Scripts run offline with standard-library and local imports only, no terminal input or dependency installation.
- Import a **public** Vite repository with a root `package-lock.json` or `pnpm-lock.yaml` and an app-directory `package.json` whose `dev` script forwards Vite options. For a monorepo, input the relative app directory (e.g. `apps/editor`). For a clean first test click **Use Gravity UI example** (the Gravity UI team's public Vite template). Check the first render in the embed and the direct link. Check that Stop prevents the URL from remaining live and that an unattended URL expires. Imported files live only on that active VM's disk. No private repos, secrets, persistent projects, or repo editing. Dependency install lifecycle scripts are disabled; the project’s own dev preparation may run offline. A repo that needs native binaries built by install hooks (for example better-sqlite3) or network access while running may require adaptation. The user’s ui-builder editor can be attempted with apps/editor but is not the template baseline.
- Check that a concurrent second request gets 429 and that a confirmed stop permits a new run. When a run disappears or cannot be confirmed stopped, the lease can temporarily remain active until its safety deadline. The cap is ten VM starts per UTC day across all preview and production deployments that share the same DB.

## Boundaries

SDK-managed ephemeral microVMs, 1 vCPU and 2 GB RAM. Workspace scripts run without egress and cannot expose a port. GitHub import and dependency installation have separate hostname allowlists. Project code starts after blocking VM egress. Use only dependencies obtainable from the public npm registry without install scripts. Preview URLs are separate public Vercel Sandbox origins that anyone with the URL can access until Stop or expiry (at most ten minutes including setup). Do not accept private source or secrets, turn the allowlist off for untrusted anonymous traffic, or reuse the main origin for preview content. Set project-level spend alerts/budget controls before planning any broader beta.
