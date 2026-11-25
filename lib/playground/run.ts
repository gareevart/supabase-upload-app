import { posix } from 'node:path';
import { APIError, Sandbox, type Command } from '@vercel/sandbox';
import { isSandboxPreviewUrl, PREVIEW_PORT, runDurationMs, type RunInput } from './input';
import { HTML_PREVIEW_SERVER, htmlPreviewFiles, htmlPreviewPath } from './html-preview';
import { runnableKind } from './workspace';

const LOG_LIMIT = 16 * 1024;
const NO_NETWORK = 'deny-all' as const;
const PACKAGE_ENV = {
  COREPACK_ENABLE_PROJECT_SPEC: '0',
  npm_config_manage_package_manager_versions: 'false',
  npm_config_fetch_retries: '0',
  npm_config_fetch_timeout: '25000',
};

export class PlaygroundRunError extends Error {
  constructor(message: string, readonly logs = '') {
    super(message);
  }
}

export function sandboxName(id: string) {
  return `gareev-playground-${id}`;
}

async function collect(command: Command) {
  let text = '';
  const stream = command.logs({ signal: AbortSignal.timeout(4_000) });
  try {
    for await (const line of stream) {
      const room = LOG_LIMIT - text.length;
      text += line.data.slice(0, room);
      if (text.length >= LOG_LIMIT) return text + '\n[Output truncated]';
    }
  } catch {
    return text + '\n[Log stream unavailable]';
  } finally {
    stream.close();
  }
  return text;
}

async function requireSuccess(label: string, command: Command) {
  if (command.exitCode !== 0) {
    throw new PlaygroundRunError(`${label} failed (exit ${command.exitCode}).`, await collect(command));
  }
}

function previewAddress(sandbox: Sandbox) {
  const address = sandbox.domain(PREVIEW_PORT);
  const expiresAt = sandbox.expiresAt;
  if (!isSandboxPreviewUrl(address) || !expiresAt) throw new PlaygroundRunError('Preview is unavailable.');
  return { url: new URL(address), expiresAt: expiresAt.toISOString() };
}

async function waitForPreview(sandbox: Sandbox, url: URL, command: Command, error: string) {
  for (let retry = 0; retry < 20; retry++) {
    const probe = await sandbox.runCommand('curl', [
      '--noproxy', '*', '--silent', '--output', '/dev/null', '--fail', '--max-time', '1',
      '--header', `Host: ${url.hostname}`, `http://127.0.0.1:${PREVIEW_PORT}${url.pathname}`,
    ], { timeoutMs: 2_000 });
    if (probe.exitCode === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new PlaygroundRunError(error, await collect(command));
}

export async function runInSandbox(input: RunInput, runId: string, release: () => Promise<void>) {
  let sandbox: Sandbox | undefined;
  let keepPreview = false;
  let stage = 'Sandbox creation';
  try {
    const github = input.mode === 'github';
    const python = !github && runnableKind(input.entry) === 'python';
    const html = !github && runnableKind(input.entry) === 'html';
    sandbox = await Sandbox.create({
      name: sandboxName(runId),
      image: python ? 'vercel/sandbox/python:3.14' : 'vercel/sandbox/node:24',
      resources: { vcpus: 1 },
      timeout: runDurationMs(input),
      persistent: false,
      ports: github || html ? [PREVIEW_PORT] : [],
      networkPolicy: github ? { allow: ['github.com', 'registry.npmjs.org'] } : NO_NETWORK,
      signal: AbortSignal.timeout(25_000),
    });

    // Managed images do not necessarily use /vercel/sandbox. Use the live session's cwd.
    const work = sandbox.cwd;
    if (!posix.isAbsolute(work) || work === '/') throw new Error('Missing sandbox working directory.');
    const source = posix.join(work, 'workspace');
    const repo = posix.join(work, 'repo');

    if (input.mode === 'files') {
      stage = 'Workspace creation';
      const folders = input.folders ?? [];
      await requireSuccess(stage, await sandbox.runCommand({
        cmd: 'mkdir', args: ['-p', '--', 'workspace', ...folders.map((folder) => `workspace/${folder}`)],
        cwd: work, timeoutMs: 3_000,
      }));
      if (html) {
        stage = 'Writing workspace files';
        const assets = htmlPreviewFiles(input.files, input.entry);
        await sandbox.writeFiles([
          { path: 'playground-html-preview.mjs', content: Buffer.from(HTML_PREVIEW_SERVER) },
          ...assets.map(({ name, content }) => ({ path: `workspace/${name}`, content: Buffer.from(content) })),
        ], { signal: AbortSignal.timeout(5_000) });
        stage = 'Preview startup';
        const { url, expiresAt } = previewAddress(sandbox);
        url.pathname = htmlPreviewPath(input.entry);
        const server = await sandbox.runCommand({
          cmd: 'node', args: ['playground-html-preview.mjs', String(PREVIEW_PORT), input.entry,
            JSON.stringify(assets.map(({ name, mime }) => [name, mime]))],
          cwd: work, detached: true,
        });
        await waitForPreview(sandbox, url, server, 'HTML preview did not become ready.');
        keepPreview = true;
        return { kind: 'preview' as const, source: 'html' as const, runId, previewUrl: url.href, expiresAt };
      }

      stage = 'Writing workspace files';
      await sandbox.writeFiles([
        ...(!python && !input.files.some(({ name }) => name === 'package.json') && !folders.includes('package.json')
          ? [{ path: 'workspace/package.json', content: Buffer.from('{"type":"module"}') }] : []),
        ...input.files.map(({ name, content }) => ({
          path: `workspace/${name}`, content: Buffer.from(content),
        })),
      ], { signal: AbortSignal.timeout(5_000) });
      stage = 'Script execution';
      const command = await sandbox.runCommand({
        cmd: python ? 'python3' : 'node',
        args: python ? ['-B', '-s', '--', input.entry] : ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--', input.entry],
        cwd: source, timeoutMs: 8_000,
      });
      return { kind: 'output' as const, output: await collect(command), exitCode: command.exitCode };
    }

    stage = 'GitHub import';
    const cloned = await sandbox.runCommand({
      cmd: 'git', args: ['-c', 'credential.helper=', 'clone', '--depth', '1', '--no-tags', '--', input.repo, repo],
      cwd: work, env: { GIT_TERMINAL_PROMPT: '0' }, timeoutMs: 22_000,
    });
    await requireSuccess('GitHub import', cloned);
    const appDir = input.directory ? `${repo}/${input.directory}` : repo;
    const exists = await sandbox.runCommand('test', ['-f', `${appDir}/package.json`], { timeoutMs: 3_000 });
    if (exists.exitCode !== 0) throw new PlaygroundRunError('No package.json in the selected directory.');
    const pnpmLock = await sandbox.runCommand('test', ['-f', `${repo}/pnpm-lock.yaml`], { timeoutMs: 3_000 });
    const pnpm = pnpmLock.exitCode === 0;
    if (!pnpm) {
      const npmLock = await sandbox.runCommand('test', ['-f', `${repo}/package-lock.json`], { timeoutMs: 3_000 });
      if (npmLock.exitCode !== 0) throw new PlaygroundRunError('Commit a package-lock.json or pnpm-lock.yaml at the repository root.');
    }

    stage = 'Dependency install';
    const manager = pnpm ? 'pnpm' : 'npm';
    const install = await sandbox.runCommand({
      cmd: manager,
      args: pnpm
        ? ['install', '--frozen-lockfile', '--ignore-scripts', '--ignore-pnpmfile', '--registry=https://registry.npmjs.org/']
        : ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org/'],
      env: PACKAGE_ENV, cwd: repo, timeoutMs: 85_000,
    });
    await requireSuccess('Dependency install', install);
    await sandbox.update({ networkPolicy: NO_NETWORK });

    stage = 'Preview startup';
    const { url: previewUrl, expiresAt } = previewAddress(sandbox);
    const server = await sandbox.runCommand({
      cmd: manager,
      args: ['run', 'dev', ...(pnpm ? [] : ['--']), '--host', '0.0.0.0', '--port', String(PREVIEW_PORT), '--strictPort'],
      cwd: appDir,
      env: {
        ...PACKAGE_ENV,
        // Workspace preparation can run here, after egress is disabled. Install hooks stay off.
        npm_config_enable_pre_post_scripts: 'true',
        __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: previewUrl.hostname,
      },
      detached: true,
    });
    await waitForPreview(sandbox, previewUrl, server, 'Vite did not become ready on port 4173. Check the dev script.');
    keepPreview = true;
    return { kind: 'preview' as const, runId, previewUrl: previewUrl.href, expiresAt };
  } catch (error) {
    if (error instanceof PlaygroundRunError) throw error;
    const status = error instanceof APIError ? error.response.status : undefined;
    const name = error instanceof Error ? error.name : 'Unknown';
    console.error('Playground stage failed:', { stage, name, status });
    throw new PlaygroundRunError(`${stage} failed. No cloud result was returned.`);
  } finally {
    // If creation is ambiguous, the DB lease remains in force until after the VM could expire.
    // A failed stop must not release the global concurrency lock early.
    if (sandbox && !keepPreview) {
      try {
        await sandbox.stop({ signal: AbortSignal.timeout(10_000) });
        await release();
      } catch {
        console.error('Playground cleanup unconfirmed; quota remains leased.');
      }
    }
  }
}

export async function stopSandbox(id: string): Promise<boolean> {
  try {
    const sandbox = await Sandbox.get({ name: sandboxName(id), resume: false, signal: AbortSignal.timeout(8_000) });
    if (sandbox.status === 'running' || sandbox.status === 'pending' || sandbox.status === 'stopping') {
      await sandbox.stop({ signal: AbortSignal.timeout(10_000) });
    }
    return true;
  } catch (error) {
    if (!(error instanceof APIError) || error.response.status !== 404) throw error;
    // The VM is no longer reachable, but its actual stop time is unknown.
    return false;
  }
}
