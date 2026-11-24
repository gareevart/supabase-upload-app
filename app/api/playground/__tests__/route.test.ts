/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST, DELETE } from '../route';
import { runInSandbox, stopSandbox } from '@/lib/playground/run';
import { createClient } from '@supabase/supabase-js';

jest.mock('@/app/auth/withApiAuth', () => ({
  withApiAuth: (handler: Function) => (req: NextRequest) =>
    req.headers.has('x-test-user') ? handler(req, { id: req.headers.get('x-test-user') }) :
      Promise.resolve(new Response(null, { status: 401 })),
}));
jest.mock('@/lib/playground/run', () => ({
  runInSandbox: jest.fn(),
  stopSandbox: jest.fn(),
  PlaygroundRunError: class extends Error {},
}));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const runId = 'f02fe46c-a3d5-4bee-8f64-0ab151028a10';
const rpc = jest.fn();
const ok = (data: boolean) => ({ abortSignal: async () => ({ data, error: null }) });
const snapshot = { ...process.env };

beforeEach(() => {
  jest.resetAllMocks();
  process.env.PLAYGROUND_ALLOWED_USER_IDS = 'invited';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  (createClient as jest.Mock).mockReturnValue({ rpc });
});
afterEach(() => { process.env = { ...snapshot }; });

function post(user?: string, origin = 'https://example.com') {
  const headers = new Headers({ 'content-type': 'application/json', origin });
  if (user) headers.set('x-test-user', user);
  return new NextRequest('https://example.com/api/playground', {
    method: 'POST', headers, body: JSON.stringify({ mode: 'files', entry: 'example.ts', files: [{ name: 'example.ts', content: 'console.log(2+2)' }] }),
  });
}

it('does not reserve quota for disabled, anonymous, not invited, or foreign-origin requests', async () => {
  expect((await POST(post())).status).toBe(401);
  expect((await POST(post('other'))).status).toBe(403);
  expect((await POST(post('invited', 'https://foreign.example.com'))).status).toBe(403);
  delete process.env.PLAYGROUND_ALLOWED_USER_IDS;
  expect((await POST(post('invited'))).status).toBe(503);
  expect(rpc).not.toHaveBeenCalled();
  expect(runInSandbox).not.toHaveBeenCalled();
});

it('fails closed on exhausted quota', async () => {
  rpc.mockReturnValue(ok(false));
  expect((await POST(post('invited'))).status).toBe(429);
  expect(runInSandbox).not.toHaveBeenCalled();
});

it('starts an authorized run and releases only on the runner cleanup callback', async () => {
  rpc.mockReturnValue(ok(true));
  (runInSandbox as jest.Mock).mockImplementation(async (_input, _id, release) => {
    await release();
    return { kind: 'output', output: '4', exitCode: 0 };
  });
  const response = await POST(post('invited'));
  expect(await response.json()).toEqual({ kind: 'output', output: '4', exitCode: 0 });
  expect(rpc.mock.calls.map(([name]) => name)).toEqual(['reserve_playground', 'release_playground']);
});

it('never stops a sandbox without ownership', async () => {
  rpc.mockReturnValue(ok(false));
  const request = new NextRequest(`https://example.com/api/playground?runId=${runId}`, {
    method: 'DELETE', headers: { 'x-test-user': 'other' },
  });
  expect((await DELETE(request)).status).toBe(404);
  expect(stopSandbox).not.toHaveBeenCalled();
});
