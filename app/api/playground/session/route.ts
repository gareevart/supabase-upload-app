import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import { Sandbox } from '@vercel/sandbox';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';
import type { Database } from '@/lib/types';
import { MAX_CODE_BYTES, readBoundedJson, validRunId } from '@/lib/playground/input';
import { parseWorkspaceDraft } from '@/lib/playground/workspace';
import { linuxSandboxName, LINUX_RESERVE_SECONDS, LINUX_SESSION_MS, ptyUrl } from '@/lib/playground/linux-session';
import { snapshotLinux } from '@/lib/playground/linux-snapshot';
import { devPort, publishDevPort } from '@/lib/playground/dev-port';

export const runtime = 'nodejs';
export const maxDuration = 60;
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };

const json = (body: object, status = 200) => NextResponse.json(body, { headers, status });
const fail = (error: string, status: number) => json({ error }, status);
const allowedOrigin = (req: NextRequest) =>
  req.headers.get('sec-fetch-site') !== 'cross-site' &&
  (!req.headers.get('origin') || req.headers.get('origin') === req.nextUrl.origin);

function database() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Quota unavailable.');
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function workspaceRoot(sandbox: Sandbox) {
  if (!posix.isAbsolute(sandbox.cwd) || sandbox.cwd === '/') throw new Error('Invalid sandbox working directory.');
  return posix.join(sandbox.cwd, 'workspace');
}

async function ticket(sandbox: Sandbox, cwd: string) {
  const { url, token } = await sandbox.currentSession().openInteractive({ signal: AbortSignal.timeout(8_000) });
  const socket = ptyUrl(url, token);
  if (!socket) throw new Error('Invalid terminal endpoint.');
  // The controller can lag session creation in a different region. This is
  // the same health endpoint used by the Vercel Sandbox CLI, without the ticket.
  const health = new URL('/health', socket);
  health.protocol = 'https:';
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** (attempt - 1)));
    const response = await fetch(health, {
      signal: AbortSignal.timeout(1_250), redirect: 'error', cache: 'no-store',
    }).catch(() => null);
    if (response?.ok) return { url: socket.href, cwd };
  }
  throw new Error('Terminal controller did not become ready.');
}

const handle = withApiAuth(async (req, user) => {
  const value = await readBoundedJson(req).catch(() => null);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Invalid terminal request.', 400);
  const body = value as Record<string, unknown>;
  if (body.action === 'start') {
    const workspace = parseWorkspaceDraft(body.workspace, MAX_CODE_BYTES);
    if (!workspace) return fail('Invalid workspace or workspace too large.', 400);
    const runId = randomUUID();
    const args = { p_user_id: user.id, p_run_id: runId };
    let sandbox: Sandbox | undefined;
    try {
      const db = database();
      const { data, error } = await db.rpc('reserve_playground', {
        ...args, p_environment: 'preview', p_seconds: LINUX_RESERVE_SECONDS,
      }).abortSignal(AbortSignal.timeout(5_000));
      if (error) return fail('Playground quota unavailable.', 503);
      if (data === 'busy' || data === 'time' || data === 'daily') return fail('The shared sandbox slot or runtime budget is unavailable.', 429);
      if (data !== 'reserved') return fail('Cloud runs are not enabled on this deployment.', 503);

      try {
        sandbox = await Sandbox.create({
          name: linuxSandboxName(runId), image: 'vercel/sandbox/node:24',
          persistent: false, timeout: LINUX_SESSION_MS, resources: { vcpus: 1 }, ports: [],
          networkPolicy: { allow: ['registry.npmjs.org'] }, signal: AbortSignal.timeout(22_000),
        });
        const cwd = workspaceRoot(sandbox);
        const cmd = await sandbox.runCommand({
          cmd: 'mkdir', args: ['-p', '--', cwd, ...workspace.folders.map((dir) => posix.join(cwd, dir))],
          cwd: sandbox.cwd, timeoutMs: 4_000,
        });
        if (cmd.exitCode !== 0) throw new Error('Workspace initialization failed.');
        if (workspace.files.length) await sandbox.writeFiles(workspace.files.map(({ name, content }) => ({
          path: posix.join(cwd, name), content: Buffer.from(content),
        })), { signal: AbortSignal.timeout(6_000) });
        if (!sandbox.expiresAt) throw new Error('Unknown VM expiration.');
        return json({ ...(await ticket(sandbox, cwd)), runId, expiresAt: sandbox.expiresAt.toISOString() });
      } catch {
        // If creation or shutdown is ambiguous, leave the lease to expire rather than launching another VM.
        if (sandbox) {
          try {
            await sandbox.stop({ signal: AbortSignal.timeout(8_000) });
            await db.rpc('release_playground', { ...args, p_refund: true }).abortSignal(AbortSignal.timeout(4_000));
          } catch { /* The lease remains until the VM expires. */ }
        }
        return fail('Could not start the Linux terminal.', 502);
      }
    } catch { return fail('Playground quota unavailable.', 503); }
  }

  if (!validRunId(body.runId) || typeof body.action !== 'string' || !['connect', 'snapshot', 'publish', 'unpublish', 'stop'].includes(body.action)) {
    return fail('Invalid terminal request.', 400);
  }
  const port = body.action === 'publish' ? devPort(body.port) : null;
  if (body.action === 'publish' && port === null) return fail('Select a supported development port.', 400);
  const args = { p_user_id: user.id, p_run_id: body.runId };
  try {
    const db = database();
    const { data, error } = await db.rpc('owns_playground', args).abortSignal(AbortSignal.timeout(5_000));
    if (error) return fail('Ownership verification unavailable.', 503);
    if (!data) return fail('Terminal session not found or expired.', 404);
    const sandbox = await Sandbox.get({ name: linuxSandboxName(body.runId), resume: false, signal: AbortSignal.timeout(8_000) });
    if (body.action === 'stop') {
      await sandbox.stop({ signal: AbortSignal.timeout(8_000) });
      const { error: refund } = await db.rpc('release_playground', { ...args, p_refund: true }).abortSignal(AbortSignal.timeout(4_000));
      if (refund) return fail('Terminal stopped, but the budget update could not be confirmed.', 502);
      return json({ stopped: true });
    }
    if (sandbox.status !== 'running') return fail('Terminal session not found or expired.', 404);
    if (body.action === 'connect') return json(await ticket(sandbox, workspaceRoot(sandbox)));
    if (body.action === 'snapshot') {
      try { return json({ workspace: await snapshotLinux(sandbox.currentSession(), workspaceRoot(sandbox), randomUUID()) }); }
      catch { return fail('Could not sync project files. Check workspace limits and retry.', 422); }
    }
    if (body.action === 'unpublish') {
      await sandbox.update({ ports: [] }, { signal: AbortSignal.timeout(8_000) });
      return json({ closed: true });
    }
    if (port !== null) {
      try { return json({ url: await publishDevPort(sandbox, port) }); }
      catch { return fail('Could not open this port. Check that the dev server is running and listening on 0.0.0.0.', 422); }
    }
    return fail('Invalid terminal request.', 400);
  } catch {
    return fail('Could not complete the terminal request. The VM expires automatically.', 502);
  }
});

export async function POST(req: NextRequest) {
  if (!allowedOrigin(req)) return fail('Origin not allowed.', 403);
  if (process.env.VERCEL_ENV === 'production') return fail('The Linux terminal is available in Preview only.', 503);
  return handle(req);
}
