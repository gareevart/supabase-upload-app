/** @jest-environment node */
import { bashStart, linuxSandboxName, ptyUrl } from '../linux-session';
import { snapshotLinux } from '../linux-snapshot';
import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Session } from '@vercel/sandbox';

it('creates an exact provider PTY URL without reflecting basic auth and starts interactive Bash', () => {
  expect(ptyUrl('wss://controller.example.test/pty?route=x', 'a+b?')?.href)
    .toBe('wss://controller.example.test/pty?route=x&token=a%2Bb%3F');
  expect(ptyUrl('ws://controller.example.test/pty', 't')).toBeNull();
  expect(ptyUrl('wss://user:pass@controller.example.test/pty', 't')).toBeNull();
  expect(ptyUrl('wss://controller.example.test/pty#invalid', 't')).toBeNull();
  expect(bashStart('/vm/workspace', 78, 12)).toMatchObject({
    type: 'start', command: '/bin/bash', args: ['--noprofile', '--norc', '-i'], cols: 78, rows: 12, cwd: '/vm/workspace',
  });
  expect(linuxSandboxName('id')).toBe('gareev-playground-terminal-id');
});

it('syncs actual text files and empty folders without following symlinks or copying installed packages', async () => {
  const home = await mkdtemp(join(tmpdir(), 'linux-snapshot-test-'));
  const root = join(home, 'project');
  const run = promisify(execFile);
  const session = {
    cwd: home,
    runCommand: async ({ cmd, args, cwd }: { cmd: string; args: string[]; cwd: string }) => {
      await run(cmd, args, { cwd });
      return { exitCode: 0 };
    },
    readFile: async ({ path }: { path: string }) => createReadStream(path),
  } as unknown as Session;
  try {
    await mkdir(join(root, 'dir', 'empty'), { recursive: true });
    await mkdir(join(root, 'node_modules'));
    await writeFile(join(root, 'dir', 'example.txt'), 'workspace text\n');
    await writeFile(join(root, 'image.bin'), Buffer.from([0, 2, 3, 4]));
    await writeFile(join(root, 'node_modules', 'package.js'), 'dependency');
    await writeFile(join(home, 'private.txt'), 'not part of the workspace');
    await symlink(join(home, 'private.txt'), join(root, 'shortcut.txt'));
    await expect(snapshotLinux(session, root, 'fixture')).resolves.toEqual({
      files: [{ name: 'dir/example.txt', content: 'workspace text\n' }],
      folders: ['dir', 'dir/empty'], entry: 'dir/example.txt',
    });
  } finally { await rm(home, { recursive: true, force: true }); }
});

it('applies a folder move to the actual VM filesystem without replacing a conflicting Bash edit', async () => {
  const { applyLinuxChanges } = await import('../linux-apply');
  const { readFile } = await import('node:fs/promises');
  const home = await mkdtemp(join(tmpdir(), 'linux-edits-test-'));
  const root = join(home, 'project');
  const run = promisify(execFile);
  const session = {
    cwd: home,
    writeFiles: async (files: { path: string; content: Buffer }[]) => {
      for (const file of files) await writeFile(file.path, file.content);
    },
    runCommand: async ({ cmd, args, cwd }: { cmd: string; args: string[]; cwd: string }) => {
      try { await run(cmd, args, { cwd }); return { exitCode: 0 }; }
      catch (e) { return { exitCode: (e as { code: number }).code }; }
    },
  };
  const sandbox = { currentSession: () => session } as unknown as Parameters<typeof applyLinuxChanges>[0];
  try {
    await mkdir(join(root, 'old'), { recursive: true });
    await writeFile(join(root, 'old', 'memo.txt'), 'terminal change');
    const edits = [
      { kind: 'folder' as const, path: 'new', create: true },
      { kind: 'folder' as const, path: 'old', create: false },
      { kind: 'file' as const, path: 'old/memo.txt', before: 'original', after: null },
      { kind: 'file' as const, path: 'new/memo.txt', before: null, after: 'original' },
    ];
    await expect(applyLinuxChanges(sandbox, root, 'conflict', edits)).resolves.toBe(false);
    await expect(readFile(join(root, 'old/memo.txt'), 'utf8')).resolves.toBe('terminal change');
    await expect(readFile(join(root, 'new/memo.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    await writeFile(join(root, 'old', 'memo.txt'), 'original');
    await expect(applyLinuxChanges(sandbox, root, 'rename', edits)).resolves.toBe(true);
    await expect(readFile(join(root, 'new/memo.txt'), 'utf8')).resolves.toBe('original');
    await expect(readFile(join(root, 'old/memo.txt'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(applyLinuxChanges(sandbox, root, 'retry', edits)).resolves.toBe(true);
  } finally { await rm(home, { recursive: true, force: true }); }
});
