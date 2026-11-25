/** @jest-environment node */
import type { Sandbox } from '@vercel/sandbox';
import { DEV_PORTS, devPort, publishDevPort } from '../dev-port';

const existing = { port: 3000, url: 'https://previous.vercel.run', subdomain: 'previous' };
const createSandbox = (routes: { port: number; url: string; subdomain: string }[] = []) => {
  const runCommand = jest.fn().mockResolvedValue({ exitCode: 0 });
  const sandbox = {
    routes,
    status: 'running',
    runCommand, currentSession: jest.fn(() => ({ runCommand })),
    update: jest.fn().mockResolvedValue(undefined),
    domain: jest.fn().mockReturnValue('https://dev-example.vercel.run'),
  };
  return { sandbox, client: sandbox as unknown as Sandbox };
};

it.each(DEV_PORTS)('accepts preview port %s', (port) => {
  expect(devPort(port)).toBe(port);
});

it.each(['5173', [], {}, null, 0, 22, 5173.1, 65536, Infinity, NaN])('rejects non-allowed preview port %p', (port) => {
  expect(devPort(port)).toBeNull();
});

it('checks local HTTP before explicitly exposing the port and uses only the SDK URL', async () => {
  const { sandbox, client } = createSandbox([existing]);
  await expect(publishDevPort(client, 5173)).resolves.toBe('https://dev-example.vercel.run/');
  expect(sandbox.runCommand).toHaveBeenCalledWith({
    cmd: 'curl',
    args: [
      '-q', '--noproxy', '*', '--proto', '=http', '--head', '--silent', '--output', '/dev/null',
      '--connect-timeout', '1', '--max-time', '2', 'http://127.0.0.1:5173/',
    ],
    timeoutMs: 3_000,
  });
  expect(sandbox.runCommand.mock.invocationCallOrder[0]).toBeLessThan(sandbox.update.mock.invocationCallOrder[0]);
  expect(sandbox.update).toHaveBeenCalledWith({ ports: [5173] }, { signal: expect.any(AbortSignal) });
  expect(sandbox.domain).toHaveBeenCalledWith(5173);
  expect(sandbox.update).toHaveBeenCalledTimes(1);
});

it('does not touch the routes when the server is not listening', async () => {
  const { sandbox, client } = createSandbox([existing]);
  sandbox.runCommand.mockResolvedValue({ exitCode: 7 });
  await expect(publishDevPort(client, 5173)).rejects.toThrow('0.0.0.0');
  expect(sandbox.update).not.toHaveBeenCalled();
  expect(sandbox.domain).not.toHaveBeenCalled();
});

it('does not try to access a stopped session or an unsupported port', async () => {
  const { sandbox, client } = createSandbox();
  sandbox.status = 'stopped';
  await expect(publishDevPort(client, 5173)).rejects.toThrow('no longer running');
  await expect(publishDevPort(client, 22)).rejects.toThrow('not supported');
  expect(sandbox.runCommand).not.toHaveBeenCalled();
  expect(sandbox.update).not.toHaveBeenCalled();
});

it('returns the same exposure without mutating routes on repeat', async () => {
  const { sandbox, client } = createSandbox([existing]);
  await expect(publishDevPort(client, 3000)).resolves.toBe('https://dev-example.vercel.run/');
  expect(sandbox.update).not.toHaveBeenCalled();
});

it.each(['http://dev-example.vercel.run', 'https://dev-example.vercel.run.evil.test', 'https://gareev.de',
  'https://dev-example.vercel.run/other', 'https://dev-example.vercel.run/?x=1'])(
  'restores the old ports rather than returning invalid preview origin %s', async (url) => {
    const { sandbox, client } = createSandbox([existing]);
    sandbox.domain.mockReturnValue(url);
    await expect(publishDevPort(client, 5173)).rejects.toThrow('valid preview URL');
    expect(sandbox.update.mock.calls.map(([params]) => params)).toEqual([{ ports: [5173] }, { ports: [3000] }]);
  },
);

it('attempts to revert even if the update response was lost and surfaces an actionable error if revert failed', async () => {
  const { sandbox, client } = createSandbox();
  sandbox.update.mockRejectedValue(new Error('provider unavailable'));
  await expect(publishDevPort(client, 5173)).rejects.toThrow('Stop the terminal');
  expect(sandbox.update.mock.calls.map(([params]) => params)).toEqual([{ ports: [5173] }, { ports: [] }]);
});
