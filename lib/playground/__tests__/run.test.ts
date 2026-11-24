/** @jest-environment node */
import { Sandbox } from '@vercel/sandbox';
import { runInSandbox } from '../run';

jest.mock('@vercel/sandbox', () => ({ APIError: Error, Sandbox: { create: jest.fn() } }));

const id = 'f02fe46c-a3d5-4bee-8f64-0ab151028a10';
const success = { exitCode: 0, logs: () => Object.assign((async function* () {
  yield { data: 'hello\n' };
})(), { close: jest.fn() }) };
let vm: {
  runCommand: jest.Mock; writeFiles: jest.Mock; update: jest.Mock; stop: jest.Mock;
  domain: jest.Mock; expiresAt: Date;
};
const release = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  vm = {
    runCommand: jest.fn().mockResolvedValue(success), writeFiles: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined), stop: jest.fn().mockResolvedValue(undefined),
    domain: jest.fn(() => 'https://preview.vercel.run'), expiresAt: new Date('2026-11-27T14:00:00Z'),
  };
  (Sandbox.create as jest.Mock).mockResolvedValue(vm);
  release.mockResolvedValue(undefined);
});

it('runs JavaScript offline with no open ports, returns output and tears down the VM', async () => {
  await expect(runInSandbox({ mode: 'javascript', code: 'console.log("hello")' }, id, release))
    .resolves.toEqual({ kind: 'output', output: 'hello\n', exitCode: 0 });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    networkPolicy: 'deny-all', persistent: false, ports: [], timeout: 30_000,
  }));
  expect(vm.writeFiles).toHaveBeenCalledWith([{ path: 'main.mjs', content: Buffer.from('console.log("hello")') }], expect.anything());
  expect(vm.runCommand).toHaveBeenCalledWith('node', ['/vercel/sandbox/main.mjs'], { timeoutMs: 8_000 });
  expect(vm.stop).toHaveBeenCalledTimes(1);
  expect(vm.stop.mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]);
});

it('boots Vite only after limiting install to npm and turning off egress', async () => {
  const result = await runInSandbox({ mode: 'github', repo: 'https://github.com/a/b.git', directory: 'apps/editor' }, id, release);
  expect(result).toEqual({ kind: 'preview', runId: id, previewUrl: 'https://preview.vercel.run/', expiresAt: vm.expiresAt.toISOString() });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ networkPolicy: { allow: ['github.com'] }, ports: [4173] }));
  expect(vm.update.mock.calls).toEqual([[{ networkPolicy: { allow: ['registry.npmjs.org'] } }], [{ networkPolicy: 'deny-all' }]]);
  const install = vm.runCommand.mock.calls.findIndex(([item]) => item.cmd === 'pnpm' && item.args[0] === 'install');
  const dev = vm.runCommand.mock.calls.findIndex(([item]) => item.detached);
  expect(vm.runCommand.mock.calls[install][0].args).toContain('--ignore-scripts');
  expect(vm.update.mock.invocationCallOrder[0]).toBeLessThan(vm.runCommand.mock.invocationCallOrder[install]);
  expect(vm.runCommand.mock.invocationCallOrder[install]).toBeLessThan(vm.update.mock.invocationCallOrder[1]);
  expect(vm.update.mock.invocationCallOrder[1]).toBeLessThan(vm.runCommand.mock.invocationCallOrder[dev]);
  expect(vm.runCommand.mock.calls[dev][0]).toMatchObject({ cwd: '/vercel/sandbox/repo/apps/editor' });
  expect(vm.stop).not.toHaveBeenCalled();
  expect(release).not.toHaveBeenCalled();
});

it('stops and releases on install failure without running the project', async () => {
  vm.runCommand.mockImplementation(async (command) => ({
    ...success, exitCode: command.cmd === 'pnpm' ? 1 : 0,
  }));
  await expect(runInSandbox({ mode: 'github', repo: 'https://github.com/a/b.git', directory: '' }, id, release))
    .rejects.toThrow('Dependency install failed');
  expect(vm.runCommand.mock.calls.some(([command]) => command.detached)).toBe(false);
  expect(vm.stop).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

it('keeps the lease if the VM cannot be confirmed stopped or created', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vm.stop.mockRejectedValueOnce(new Error('unreachable'));
    await runInSandbox({ mode: 'javascript', code: '1' }, id, release);
    expect(release).not.toHaveBeenCalled();
    (Sandbox.create as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    await expect(runInSandbox({ mode: 'javascript', code: '1' }, id, release)).rejects.toThrow('timeout');
    expect(release).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});
