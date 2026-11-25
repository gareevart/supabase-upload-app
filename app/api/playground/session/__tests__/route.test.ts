/** @jest-environment node */
import { NextRequest } from 'next/server';
import { Sandbox } from '@vercel/sandbox';
import { createClient } from '@supabase/supabase-js';
import { POST } from '../route';
import { publishDevPort } from '@/lib/playground/dev-port';
import { applyLinuxChanges } from '@/lib/playground/linux-apply';
import { snapshotLinux } from '@/lib/playground/linux-snapshot';

jest.mock('@vercel/sandbox', () => ({ Sandbox: { create: jest.fn(), get: jest.fn() } }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/app/auth/withApiAuth', () => ({
  withApiAuth: (fn: (req: NextRequest, user: { id: string }) => Response) => (req: NextRequest) =>
    req.headers.get('authorization') ? fn(req, { id: 'test-user' }) : new Response(null, { status: 401 }),
}));
jest.mock('@/lib/playground/dev-port', () => ({
  devPort: (value: unknown) => value === 5173 ? 5173 : null, publishDevPort: jest.fn(),
}));
jest.mock('@/lib/playground/linux-apply', () => ({ applyLinuxChanges: jest.fn() }));
jest.mock('@/lib/playground/linux-snapshot', () => ({ snapshotLinux: jest.fn() }));

const id = 'cbc3ecfd-be6d-4abe-9612-a6724172ecdf';
const project = { files: [{ name: 'main.js', content: 'test' }], folders: [], entry: 'main.js' };
const rpc = jest.fn();
const originalFetch = globalThis.fetch;
const provider = {
  status: 'running', cwd: '/vm', expiresAt: new Date('2026-11-26T00:20:00Z'),
  runCommand: jest.fn().mockResolvedValue({ exitCode: 0 }),
  writeFiles: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  currentSession: jest.fn(() => ({
    openInteractive: jest.fn().mockResolvedValue({ url: 'wss://pty.example.test/socket', token: 'one-ticket' }),
  })),
};
const ok = (data: unknown) => ({ abortSignal: async () => ({ data, error: null }) });

function request(body: unknown, headers: Record<string, string> = { authorization: 'Bearer local' }) {
  return new NextRequest('https://example.test/api/playground/session', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  globalThis.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 200 }));
  process.env.VERCEL_ENV = 'preview';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only';
  (createClient as jest.Mock).mockReturnValue({ rpc });
  (Sandbox.create as jest.Mock).mockResolvedValue(provider);
  (Sandbox.get as jest.Mock).mockResolvedValue(provider);
  rpc.mockImplementation((operation) => ok(operation === 'reserve_playground' ? 'reserved' : true));
});

afterEach(() => { globalThis.fetch = originalFetch; });

it('only allocates a VM for an authenticated, same-origin Preview request', async () => {
  const input = { action: 'start', workspace: project };
  expect((await POST(request(input, {}))).status).toBe(401);
  expect((await POST(request(input, { authorization: 'Bearer local', origin: 'https://other.test' }))).status).toBe(403);
  process.env.VERCEL_ENV = 'production';
  expect((await POST(request(input))).status).toBe(503);
  expect(Sandbox.create).not.toHaveBeenCalled();
});

it('reserves one ephemeral sandbox, writes the project and returns only a scoped PTY ticket', async () => {
  const res = await POST(request({ action: 'start', workspace: project }));
  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toBe('private, no-store');
  const result = await res.json();
  expect(result).toMatchObject({ url: 'wss://pty.example.test/socket?token=one-ticket', cwd: '/vm/workspace' });
  expect(rpc).toHaveBeenCalledWith('reserve_playground', expect.objectContaining({ p_seconds: 600, p_environment: 'preview' }));
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    name: 'gareev-playground-terminal-' + result.runId, persistent: false, ports: [], timeout: 600_000,
    networkPolicy: { allow: ['registry.npmjs.org'] },
  }));
  expect(provider.writeFiles).toHaveBeenCalledWith([{ path: '/vm/workspace/main.js', content: Buffer.from('test') }], expect.anything());
  expect(provider.stop).not.toHaveBeenCalled();
  expect(globalThis.fetch).toHaveBeenCalledWith(new URL('https://pty.example.test/health'), expect.objectContaining({ redirect: 'error' }));
});

it('does not access another owner’s terminal, port or files', async () => {
  rpc.mockReturnValue(ok(false));
  for (const action of ['connect', 'snapshot', 'apply', 'publish', 'unpublish', 'stop']) {
    expect((await POST(request({ action, runId: id, port: 5173 }))).status).toBe(404);
  }
  expect(Sandbox.get).not.toHaveBeenCalled();
  expect(publishDevPort).not.toHaveBeenCalled();
});

it('opens only an explicitly selected port and stops before refunding the lease', async () => {
  (publishDevPort as jest.Mock).mockResolvedValue('https://dev.vercel.run/');
  (snapshotLinux as jest.Mock).mockResolvedValue(project);
  expect((await POST(request({ action: 'publish', runId: id, port: 22 }))).status).toBe(400);
  expect(await (await POST(request({ action: 'publish', runId: id, port: 5173 }))).json()).toEqual({ url: 'https://dev.vercel.run/' });
  expect(publishDevPort).toHaveBeenCalledWith(provider, 5173);
  expect(await (await POST(request({ action: 'unpublish', runId: id }))).json()).toEqual({ closed: true });
  expect(provider.update).toHaveBeenCalledWith({ ports: [] }, expect.anything());
  const snapshot = await (await POST(request({ action: 'snapshot', runId: id }))).json();
  expect(snapshot).toEqual({ workspace: project, revision: expect.stringMatching(/^[a-f0-9]{64}$/) });
  expect(await (await POST(request({ action: 'snapshot', runId: id, afterRevision: snapshot.revision }))).json())
    .toEqual({ revision: snapshot.revision, unchanged: true });
  expect(await (await POST(request({ action: 'stop', runId: id }))).json()).toEqual({ stopped: true });
  expect(Sandbox.get).toHaveBeenCalledWith(expect.objectContaining({ name: 'gareev-playground-terminal-' + id, resume: false }));
  expect(rpc).toHaveBeenLastCalledWith('release_playground', { p_user_id: 'test-user', p_run_id: id, p_refund: true });
  expect(provider.stop.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder.at(-1)!);
});

it('does not refund before a confirmed stop', async () => {
  provider.stop.mockRejectedValueOnce(new Error('service unavailable'));
  expect((await POST(request({ action: 'stop', runId: id }))).status).toBe(502);
  expect(rpc).not.toHaveBeenCalledWith('release_playground', expect.anything());
});

it('accepts a valid editor edit and returns a conflict without substituting a stale file', async () => {
  const changes = [{ kind: 'file', path: 'main.js', before: 'prev', after: 'next' }];
  const body = { action: 'apply', runId: id, changes };
  expect((await POST(request({ ...body, changes: [{ ...changes[0], path: '../outside' }] }))).status).toBe(400);
  expect(applyLinuxChanges).not.toHaveBeenCalled();
  (applyLinuxChanges as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  expect(await (await POST(request(body))).json()).toEqual({ saved: true });
  expect(applyLinuxChanges).toHaveBeenCalledWith(provider, '/vm/workspace', expect.any(String), changes);
  expect((await POST(request(body))).status).toBe(409);
});
