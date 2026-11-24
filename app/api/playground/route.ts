import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { withApiAuth } from '@/app/auth/withApiAuth';
import { parseRunInput, readBoundedJson, validRunId } from '@/lib/playground/input';
import { PlaygroundRunError, runInSandbox, stopSandbox } from '@/lib/playground/run';
import type { Database } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 210;

const headers = { 'Cache-Control': 'no-store' };
function error(message: string, status: number, logs?: string) {
  return NextResponse.json({ error: message, logs }, { status, headers });
}

function allowlist() {
  return (process.env.PLAYGROUND_ALLOWED_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
}

function checkRequest(req: NextRequest) {
  // Protect the existing cookie-authenticated route from cross-site/sibling origins.
  const origin = req.headers.get('origin');
  if (req.headers.get('sec-fetch-site') === 'cross-site' ||
      (origin !== null && origin !== req.nextUrl.origin)) {
    return error('Origin not allowed.', 403);
  }
  if (allowlist().length === 0) return error('Playground beta is not enabled.', 503);
  return null;
}

async function quota(operation: 'reserve_playground' | 'owns_playground' | 'release_playground',
  userId: string, runId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Playground database not configured.');
  const db = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error: issue } = await db.rpc(operation, { p_user_id: userId, p_run_id: runId })
    .abortSignal(AbortSignal.timeout(6_000));
  if (issue) throw new Error('Playground quota unavailable.');
  return data === true;
}

const start = withApiAuth(async (req, user) => {
  if (!allowlist().includes(user.id)) return error('This account does not have beta access.', 403);
  const body = await readBoundedJson(req).catch(() => null);
  const input = parseRunInput(body);
  if (!input) return error('Supply a valid .js, .ts or .py workspace (up to 20 files and 64 KiB), or a public GitHub repository URL.', 400);
  const runId = randomUUID();
  try {
    if (!await quota('reserve_playground', user.id, runId)) {
      return error('A run is already active or the beta has reached its daily limit.', 429);
    }
  } catch {
    return error('Playground quota unavailable. Check beta setup.', 503);
  }
  try {
    const result = await runInSandbox(input, runId, async () => {
      await quota('release_playground', user.id, runId);
    });
    return NextResponse.json(result, { headers });
  } catch (issue) {
    if (issue instanceof PlaygroundRunError) return error(issue.message, 422, issue.logs);
    console.error('Playground runner failed:', issue instanceof Error ? issue.name : 'unknown');
    return error('Sandbox did not finish. Check Vercel setup or reduce the project size and retry.', 502);
  }
});

const stop = withApiAuth(async (req, user) => {
  const runId = req.nextUrl.searchParams.get('runId');
  if (!validRunId(runId)) return error('Invalid run ID.', 400);
  try {
    if (!await quota('owns_playground', user.id, runId)) return error('Run not found or expired.', 404);
    await stopSandbox(runId);
    await quota('release_playground', user.id, runId);
    return NextResponse.json({ stopped: true }, { headers });
  } catch {
    return error('Stop could not be confirmed. The sandbox still expires automatically.', 502);
  }
});

export async function POST(req: NextRequest) {
  return checkRequest(req) ?? start(req);
}

export async function DELETE(req: NextRequest) {
  // A user removed from the allowlist may still stop their own existing run until expiry.
  if (req.headers.get('sec-fetch-site') === 'cross-site' ||
      (req.headers.get('origin') !== null && req.headers.get('origin') !== req.nextUrl.origin)) {
    return error('Origin not allowed.', 403);
  }
  return stop(req);
}
