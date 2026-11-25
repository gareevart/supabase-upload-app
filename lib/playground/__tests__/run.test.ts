/** @jest-environment node */
import { Sandbox } from '@vercel/sandbox';
import { runInSandbox } from '../run';
import npmLock from './fixtures/npm-lock.json';

jest.mock('@vercel/sandbox', () => ({ APIError: class extends Error {}, Sandbox: { create: jest.fn() } }));

const js = { mode: 'files' as const, entry: 'main.js', files: [{ name: 'main.js', content: 'console.log("hello")' }] };
const id = 'f02fe46c-a3d5-4bee-8f64-0ab151028a10';
const success = { exitCode: 0, logs: () => Object.assign((async function* () {
  yield { data: 'hello\n' };
})(), { close: jest.fn() }) };
let vm: {
  cwd: string; runCommand: jest.Mock; writeFiles: jest.Mock; update: jest.Mock; stop: jest.Mock;
  domain: jest.Mock; expiresAt: Date;
};
const release = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  vm = {
    cwd: '/vercel', runCommand: jest.fn().mockResolvedValue(success), writeFiles: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined), stop: jest.fn().mockResolvedValue(undefined),
    domain: jest.fn(() => 'https://preview.vercel.run'), expiresAt: new Date('2026-11-27T14:00:00Z'),
  };
  (Sandbox.create as jest.Mock).mockResolvedValue(vm);
  release.mockResolvedValue(undefined);
});

it('runs JavaScript offline with no open ports, returns output and tears down the VM', async () => {
  await expect(runInSandbox(js, id, release))
    .resolves.toEqual({ kind: 'output', output: 'hello\n', exitCode: 0 });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    networkPolicy: 'deny-all', persistent: false, ports: [], timeout: 30_000,
  }));
  expect(vm.writeFiles).toHaveBeenCalledWith(expect.arrayContaining([{ path: 'workspace/main.js', content: Buffer.from(js.files[0].content) }]), expect.anything());
  expect(vm.runCommand).toHaveBeenCalledWith(expect.objectContaining({
    cmd: 'node', args: expect.arrayContaining(['main.js']), cwd: '/vercel/workspace', timeoutMs: 8_000,
  }));
  expect(vm.stop).toHaveBeenCalledTimes(1);
  expect(vm.stop.mock.invocationCallOrder[0]).toBeLessThan(release.mock.invocationCallOrder[0]);
});

it('boots Vite only after limiting install to npm and turning off egress', async () => {
  const result = await runInSandbox({ mode: 'github', repo: 'https://github.com/a/b.git', directory: 'apps/editor' }, id, release);
  expect(result).toEqual({ kind: 'preview', runId: id, previewUrl: 'https://preview.vercel.run/', expiresAt: vm.expiresAt.toISOString() });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ networkPolicy: { allow: ['github.com', 'registry.npmjs.org'] }, ports: [4173] }));
  expect(vm.update.mock.calls).toEqual([[{ networkPolicy: 'deny-all' }]]);
  const install = vm.runCommand.mock.calls.findIndex(([item]) => item.cmd === 'pnpm' && item.args[0] === 'install');
  const dev = vm.runCommand.mock.calls.findIndex(([item]) => item.detached);
  expect(vm.runCommand.mock.calls[install][0].args).toContain('--ignore-scripts');
  expect(vm.runCommand.mock.invocationCallOrder[install]).toBeLessThan(vm.update.mock.invocationCallOrder[0]);
  expect(vm.update.mock.invocationCallOrder[0]).toBeLessThan(vm.runCommand.mock.invocationCallOrder[dev]);
  expect(vm.runCommand.mock.calls[dev][0]).toMatchObject({ cwd: '/vercel/repo/apps/editor' });
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
    await runInSandbox(js, id, release);
    expect(release).not.toHaveBeenCalled();
    (Sandbox.create as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
    await expect(runInSandbox(js, id, release)).rejects.toThrow('Sandbox creation failed');
    expect(release).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});


it.each([
  { entry: 'main.ts', helper: 'helper.ts', bin: 'node', image: 'vercel/sandbox/node:24' },
  { entry: 'main.py', helper: 'helper.py', bin: 'python3', image: 'vercel/sandbox/python:3.14' },
])('executes only the selected entry $entry and writes sibling files', async ({ entry, helper, bin, image }) => {
  await runInSandbox({ mode: 'files', entry, files: [{ name: helper, content: '' }, { name: entry, content: '' }] }, id, release);
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({ image, networkPolicy: 'deny-all', ports: [], persistent: false }));
  expect(vm.runCommand).toHaveBeenNthCalledWith(1, expect.objectContaining({
    cmd: 'mkdir', args: ['-p', '--', 'workspace'], cwd: '/vercel',
  }));
  expect(vm.writeFiles.mock.calls[0][0].map((file: { path: string }) => file.path)).toEqual([
    ...(bin === 'node' ? ['workspace/package.json'] : []), 'workspace/' + helper, 'workspace/' + entry,
  ]);
  expect(vm.runCommand).toHaveBeenCalledTimes(2);
  expect(vm.runCommand).toHaveBeenCalledWith(expect.objectContaining({
    cmd: bin, args: expect.arrayContaining([entry]), cwd: '/vercel/workspace', timeoutMs: 8_000,
  }));
});

it('passes a file-write failure through as a named stage and stops the VM', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vm.writeFiles.mockRejectedValueOnce(new Error('virtual filesystem failure'));
    await expect(runInSandbox(js, id, release)).rejects.toThrow('Writing workspace files failed');
    expect(vm.runCommand).toHaveBeenCalledTimes(1);
    expect(vm.stop).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  } finally { log.mockRestore(); }
});

it('creates nested and empty folders before writing files, and preserves the user’s package.json', async () => {
  const files = [
    { name: 'package.json', content: '{"type":"commonjs"}' },
    { name: 'src/main.cjs', content: 'console.log(require("./settings.json").answer)' },
    { name: 'src/settings.json', content: '{"answer":42}' },
  ];
  await runInSandbox({ mode: 'files', folders: ['src', 'src/empty'], entry: 'src/main.cjs', files }, id, release);
  expect(vm.runCommand).toHaveBeenNthCalledWith(1, expect.objectContaining({
    cmd: 'mkdir', args: ['-p', '--', 'workspace', 'workspace/src', 'workspace/src/empty'], cwd: '/vercel',
  }));
  expect(vm.writeFiles).toHaveBeenCalledWith(
    files.map(({ name, content }) => ({ path: 'workspace/' + name, content: Buffer.from(content) })), expect.anything(),
  );
  expect(vm.runCommand.mock.invocationCallOrder[0]).toBeLessThan(vm.writeFiles.mock.invocationCallOrder[0]);
  expect(vm.runCommand).toHaveBeenNthCalledWith(2, expect.objectContaining({
    cmd: 'node', args: expect.arrayContaining(['--', 'src/main.cjs']), cwd: '/vercel/workspace',
  }));
});

it('starts an isolated HTML preview and serves only the selected page and allowed project assets', async () => {
  const files = [
    { name: 'pages/hello #1.html', content: '<link rel="stylesheet" href="site.css"><script type="module" src="./ui.js"></script>' },
    { name: 'pages/site.css', content: 'body { color: red }' },
    { name: 'pages/ui.js', content: 'document.body.textContent = "Ready";' },
    { name: '.env', content: 'NOT_A_PREVIEW_ASSET=example' },
    { name: 'pages/.private.json', content: '{}' },
    { name: 'build.py', content: 'print("not served")' },
  ];
  const result = await runInSandbox({ mode: 'files', folders: ['pages'], entry: files[0].name, files }, id, release);
  expect(result).toEqual({
    kind: 'preview', source: 'html', runId: id, previewUrl: 'https://preview.vercel.run/pages/hello%20%231.html',
    expiresAt: vm.expiresAt.toISOString(),
  });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    timeout: 600_000, ports: [4173], networkPolicy: 'deny-all', persistent: false,
  }));
  expect(vm.writeFiles.mock.calls[0][0].map((file: { path: string }) => file.path)).toEqual([
    'playground-html-preview.mjs', 'workspace/pages/hello #1.html', 'workspace/pages/site.css', 'workspace/pages/ui.js',
  ]);
  expect(vm.runCommand).toHaveBeenCalledWith(expect.objectContaining({
    cmd: 'node', args: expect.arrayContaining(['playground-html-preview.mjs', 'pages/hello #1.html']), detached: true,
  }));
  expect(vm.runCommand).toHaveBeenCalledWith('curl', expect.arrayContaining([
    'http://127.0.0.1:4173/pages/hello%20%231.html',
  ]), expect.anything());
  expect(vm.stop).not.toHaveBeenCalled();
  expect(release).not.toHaveBeenCalled();
});

it('rejects preview origins outside the isolated sandbox domain and cleans up', async () => {
  vm.domain.mockReturnValue('https://gareev.de');
  await expect(runInSandbox({ mode: 'files', entry: 'index.html', files: [{ name: 'index.html', content: '' }] }, id, release))
    .rejects.toThrow('Preview is unavailable.');
  expect(vm.stop).toHaveBeenCalled();
  expect(release).toHaveBeenCalled();
});

const npmInput = {
  mode: 'files' as const, entry: 'src/main.ts', folders: ['src'],
  files: [
    { name: 'package.json', content: '{"name":"workspace-smoke","type":"module","dependencies":{"is-number":"7.0.0"}}' },
    { name: 'package-lock.json', content: JSON.stringify(npmLock) },
    { name: '.npmrc', content: 'registry=https://example.test/' },
    { name: 'npm-shrinkwrap.json', content: '{}' },
    { name: 'src/main.ts', content: 'import isNumber from "is-number"; console.log(isNumber("42"));' },
  ],
};

it('installs public npm dependencies before writing source files and runs the selected entry offline', async () => {
  await expect(runInSandbox(npmInput, id, release))
    .resolves.toEqual({ kind: 'output', output: 'hello\n', exitCode: 0, installLogs: 'hello\n' });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    networkPolicy: { allow: ['registry.npmjs.org'] }, ports: [], persistent: false, timeout: 30_000,
  }));
  expect(vm.runCommand).toHaveBeenNthCalledWith(2, expect.objectContaining({
    cmd: 'npm', args: expect.arrayContaining(['ci', '--ignore-scripts', '--registry=https://registry.npmjs.org/']),
    cwd: '/vercel/workspace-dependencies', timeoutMs: 15_000,
  }));
  expect(vm.writeFiles.mock.calls[0][0].map((file: { path: string }) => file.path))
    .toEqual(['workspace-dependencies/package.json', 'workspace-dependencies/package-lock.json']);
  expect(vm.update).toHaveBeenCalledWith({ networkPolicy: 'deny-all' }, expect.anything());
  expect(vm.runCommand.mock.invocationCallOrder[1]).toBeLessThan(vm.update.mock.invocationCallOrder[0]);
  expect(vm.update.mock.invocationCallOrder[0]).toBeLessThan(vm.writeFiles.mock.invocationCallOrder[1]);
  expect(vm.runCommand).toHaveBeenNthCalledWith(4, expect.objectContaining({
    cmd: 'node', args: expect.arrayContaining(['--', 'src/main.ts']), cwd: '/vercel/workspace',
  }));
  expect(vm.stop).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

it('returns npm diagnostics and does not run the entry when dependencies fail to install', async () => {
  vm.runCommand.mockImplementation(async ({ cmd }) => ({ ...success, exitCode: cmd === 'npm' ? 1 : 0 }));
  await expect(runInSandbox(npmInput, id, release))
    .rejects.toMatchObject({ message: 'Dependency install failed (exit 1).', logs: 'hello\n' });
  expect(vm.writeFiles).toHaveBeenCalledTimes(1);
  expect(vm.runCommand).toHaveBeenCalledTimes(2);
  expect(release).toHaveBeenCalledTimes(1);
});

it('fails closed when the npm VM cannot turn off registry access', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    vm.update.mockRejectedValueOnce(new Error('firewall unavailable'));
    await expect(runInSandbox(npmInput, id, release)).rejects.toThrow('Network isolation failed');
    expect(vm.writeFiles).toHaveBeenCalledTimes(1);
    expect(vm.runCommand).toHaveBeenCalledTimes(2);
    expect(vm.stop).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  } finally { log.mockRestore(); }
});

it('runs the official Gravity initializer then installs, closes egress and imports the generated files', async () => {
  const { Readable } = await import('node:stream');
  const changes = { folders: ['gravity-app'], files: [{ name: 'gravity-app/package.json', content: '{}' }] };
  const readFile = jest.fn().mockResolvedValue(Readable.from([JSON.stringify(changes)]));
  Object.assign(vm, { readFile });
  await expect(runInSandbox({ mode: 'npm', command: { kind: 'create', folder: 'gravity-app',
    options: { language: 'js', frontend: false, styles: false, react: false, backend: true },
  }, manifests: [] }, id, release))
    .resolves.toEqual({ kind: 'terminal', exitCode: 0, output: 'hello\n\n$ npm install\nhello\n', changes });
  expect(Sandbox.create).toHaveBeenCalledWith(expect.objectContaining({
    timeout: 165_000, persistent: false, ports: [], networkPolicy: { allow: ['registry.npmjs.org'] },
  }));
  expect(vm.runCommand).toHaveBeenNthCalledWith(2, expect.objectContaining({
    cmd: 'npm', cwd: '/vercel/workspace', args: expect.arrayContaining([
      'create', '@gravity-ui@1.0.1', '--out', 'gravity-app', '--language', 'js',
      '--no-frontend', '--no-react', '--no-styles', '--backend', '--yes',
    ]),
  }));
  expect(vm.runCommand).toHaveBeenNthCalledWith(3, expect.objectContaining({
    cmd: 'npm', cwd: '/vercel/workspace/gravity-app', args: expect.arrayContaining(['install', '--ignore-scripts']),
  }));
  expect(vm.update).toHaveBeenCalledWith({ networkPolicy: 'deny-all' }, expect.anything());
  expect(vm.update.mock.invocationCallOrder[0]).toBeLessThan(readFile.mock.invocationCallOrder[0]);
  expect(vm.stop).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

it('does not publish a partially created workspace when the npm install fails', async () => {
  vm.runCommand.mockImplementation(async ({ cmd }) => ({ ...success, exitCode: cmd === 'npm' ? 1 : 0 }));
  const readFile = jest.fn();
  Object.assign(vm, { readFile });
  await expect(runInSandbox({ mode: 'npm', command: { kind: 'install', packages: ['react'] }, manifests: [
    { name: 'package.json', content: '{}' },
  ] }, id, release)).resolves.toMatchObject({ kind: 'terminal', output: 'hello\n', exitCode: 1 });
  expect(readFile).not.toHaveBeenCalled();
  expect(vm.stop).toHaveBeenCalledTimes(1);
});
