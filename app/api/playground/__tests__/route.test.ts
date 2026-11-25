/** @jest-environment node */
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
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
const ok = (data: unknown) => ({ abortSignal: async () => ({ data, error: null }) });
const snapshot = { ...process.env };

beforeEach(() => {
  jest.resetAllMocks();
  process.env.VERCEL_ENV = 'preview';
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

it('does not reserve quota for anonymous or foreign-origin requests', async () => {
  expect((await POST(post())).status).toBe(401);
  expect((await POST(post('a-user', 'https://foreign.example.com'))).status).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
  expect(runInSandbox).not.toHaveBeenCalled();
});

it('shows non-user-specific quota without authentication', async () => {
  const snapshot = { enabled: true, remainingSeconds: 17400, totalSeconds: 18000, active: false };
  rpc.mockReturnValue(ok(snapshot));
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(snapshot);
  expect(rpc).toHaveBeenCalledWith('playground_budget', { p_environment: 'preview' });
});

it.each([['disabled', 503], ['busy', 429], ['daily', 429], ['time', 429], [null, 503]])(
  'fails closed when reservation returns %s', async (reason, status) => {
    rpc.mockReturnValue(ok(reason));
    expect((await POST(post('any-account'))).status).toBe(status);
    expect(runInSandbox).not.toHaveBeenCalled();
  },
);

it('starts a signed-in run without an allowlist and releases only on confirmed runner cleanup', async () => {
  rpc.mockReturnValue(ok('reserved'));
  (runInSandbox as jest.Mock).mockImplementation(async (_input, _id, release) => {
    await release();
    return { kind: 'output', output: '4', exitCode: 0 };
  });
  const response = await POST(post('any-account'));
  expect(await response.json()).toEqual({ kind: 'output', output: '4', exitCode: 0 });
  expect(rpc).toHaveBeenNthCalledWith(1, 'reserve_playground', expect.objectContaining({
    p_user_id: 'any-account', p_environment: 'preview', p_seconds: 30,
  }));
  expect(rpc).toHaveBeenNthCalledWith(2, 'release_playground', expect.objectContaining({ p_refund: true }));
});

it('never stops a sandbox without ownership', async () => {
  rpc.mockReturnValue(ok(false));
  const request = new NextRequest(`https://example.com/api/playground?runId=${runId}`, {
    method: 'DELETE', headers: { 'x-test-user': 'other' },
  });
  expect((await DELETE(request)).status).toBe(404);
  expect(stopSandbox).not.toHaveBeenCalled();
});

it('does not consume quota for a signed-in npm workspace missing its lockfile', async () => {
  const request = new NextRequest('https://example.com/api/playground', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': 'any-account' },
    body: JSON.stringify({ mode: 'files', entry: 'main.ts', files: [
      { name: 'main.ts', content: 'import isNumber from "is-number";' },
      { name: 'package.json', content: '{"dependencies":{"is-number":"7.0.0"}}' },
    ] }),
  });
  const response = await POST(request);
  expect(response.status).toBe(422);
  expect(await response.json()).toMatchObject({ error: 'Add package.json and package-lock.json to the same project folder.' });
  expect(rpc).not.toHaveBeenCalled();
  expect(runInSandbox).not.toHaveBeenCalled();
});

it('accepts a typed npm command only after authentication and reserves the existing quota tier', async () => {
  const makeRequest = (authenticated: boolean, command: string) => new NextRequest('https://example.com/api/playground', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(authenticated ? { 'x-test-user': 'any-account' } : {}) },
    body: JSON.stringify({ mode: 'npm', command, manifests: [] }),
  });
  expect((await POST(makeRequest(false, 'npm create @gravity-ui'))).status).toBe(401);
  expect((await POST(makeRequest(true, 'npm install --global react'))).status).toBe(400);
  expect(rpc).not.toHaveBeenCalled();
  rpc.mockReturnValue(ok('reserved'));
  (runInSandbox as jest.Mock).mockResolvedValue({ kind: 'terminal', output: 'done', exitCode: 0 });
  expect((await POST(makeRequest(true, 'npm create @gravity-ui'))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith('reserve_playground', expect.objectContaining({ p_seconds: 600 }));
  expect(runInSandbox).toHaveBeenCalledWith({
    mode: 'npm', command: { kind: 'create', folder: 'gravity-app' }, manifests: [],
  }, expect.any(String), expect.any(Function));
});
