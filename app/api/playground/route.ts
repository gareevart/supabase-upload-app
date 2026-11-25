import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { parseRunInput, readBoundedJson, validRunId, runDurationMs } from '@/lib/playground/input';
import { PlaygroundRunError, runInSandbox, stopSandbox } from '@/lib/playground/run';
import type { Database } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 210;

const headers = { 'Cache-Control': 'no-store' };
function error(message: string, status: number, logs?: string) {
  return NextResponse.json({ error: message, logs }, { status, headers });
}
function environment() {
  return process.env.VERCEL_ENV === 'production' ? 'production' : 'preview';
}
function foreignOrigin(req: NextRequest) {
  const origin = req.headers.get('origin');
  return req.headers.get('sec-fetch-site') === 'cross-site' || (origin !== null && origin !== req.nextUrl.origin);
}
function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Playground database not configured.');
  return createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function GET() {
  try {
    const { data, error: issue } = await dbClient().rpc('playground_budget', { p_environment: environment() })
      .abortSignal(AbortSignal.timeout(6_000));
    if (issue || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Budget unavailable');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, s-maxage=5' } });
  } catch {
    return error('Could not load the shared Playground budget.', 503);
  }
}

const start = withApiAuth(async (req, user) => {
  const body = await readBoundedJson(req).catch(() => null);
  const input = parseRunInput(body);
  if (!input) return error('Supply a valid workspace with a JavaScript, TypeScript, Python, or HTML entry (up to 20 files and 64 KiB), or a public GitHub repository URL.', 400);
  const runId = randomUUID();
  const args = { p_user_id: user.id, p_run_id: runId };
  try {
    const db = dbClient();
    const { data, error: issue } = await db.rpc('reserve_playground', {
      ...args, p_environment: environment(), p_seconds: runDurationMs(input) / 1_000,
    }).abortSignal(AbortSignal.timeout(6_000));
    if (issue) throw new Error('Quota reservation failed.');
    if (data === 'disabled') return error('Cloud runs are not enabled on this deployment.', 503);
    if (data === 'busy') return error('The shared sandbox slot is busy. Try again when the current run ends.', 429);
    if (data === 'daily') return error('The shared daily start limit has been reached.', 429);
    if (data === 'time') return error('There is not enough shared runtime left for this run.', 429);
    if (data !== 'reserved') throw new Error('Unexpected quota response.');
    try {
      const result = await runInSandbox(input, runId, async () => {
        const { error: releaseIssue } = await db.rpc('release_playground', { ...args, p_refund: true })
          .abortSignal(AbortSignal.timeout(6_000));
        if (releaseIssue) throw new Error('Quota refund failed.');
      });
      return NextResponse.json(result, { headers });
    } catch (issue) {
      if (issue instanceof PlaygroundRunError) return error(issue.message, 422, issue.logs);
      console.error('Playground runner failed:', issue instanceof Error ? issue.name : 'unknown');
      return error('Sandbox did not finish. Check Vercel setup or reduce the project size and retry.', 502);
    }
  } catch {
    return error('Playground quota unavailable. No run was started.', 503);
  }
});

const stop = withApiAuth(async (req, user) => {
  const runId = req.nextUrl.searchParams.get('runId');
  if (!validRunId(runId)) return error('Invalid run ID.', 400);
  const args = { p_user_id: user.id, p_run_id: runId };
  try {
    const db = dbClient();
    const { data: owned, error: ownershipIssue } = await db.rpc('owns_playground', args)
      .abortSignal(AbortSignal.timeout(6_000));
    if (ownershipIssue) throw new Error('Ownership check failed.');
    if (!owned) return error('Run not found or expired.', 404);
    const confirmed = await stopSandbox(runId);
    const { error: releaseIssue } = await db.rpc('release_playground', { ...args, p_refund: confirmed })
      .abortSignal(AbortSignal.timeout(6_000));
    if (releaseIssue) throw new Error('Quota release failed.');
    return NextResponse.json({ stopped: true }, { headers });
  } catch {
    return error('Stop could not be confirmed. The sandbox still expires automatically.', 502);
  }
});

export async function POST(req: NextRequest) {
  if (foreignOrigin(req)) return error('Origin not allowed.', 403);
  return start(req);
}

export async function DELETE(req: NextRequest) {
  if (foreignOrigin(req)) return error('Origin not allowed.', 403);
  return stop(req);
}
