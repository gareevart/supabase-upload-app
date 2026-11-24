import { posix } from 'node:path';
import { APIError, Sandbox, type Command } from '@vercel/sandbox';
import { PREVIEW_MS, PREVIEW_PORT, WORKSPACE_MS, type RunInput } from './input';

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

export async function runInSandbox(input: RunInput, runId: string, release: () => Promise<void>) {
  let sandbox: Sandbox | undefined;
  let keepPreview = false;
  let stage = 'Sandbox creation';
  try {
    const github = input.mode === 'github';
    const python = !github && input.entry.endsWith('.py');
    sandbox = await Sandbox.create({
      name: sandboxName(runId),
      image: python ? 'vercel/sandbox/python:3.14' : 'vercel/sandbox/node:24',
      resources: { vcpus: 1 },
      timeout: github ? PREVIEW_MS : WORKSPACE_MS,
      persistent: false,
      ports: github ? [PREVIEW_PORT] : [],
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
      await requireSuccess(stage, await sandbox.runCommand({
        cmd: 'mkdir', args: ['--', 'workspace'], cwd: work, timeoutMs: 3_000,
      }));
      stage = 'Writing workspace files';
      await sandbox.writeFiles([
        { path: 'workspace/package.json', content: Buffer.from('{"type":"module"}') },
        ...input.files.map(({ name, content }) => ({
          path: `workspace/${name}`, content: Buffer.from(content),
        })),
      ], { signal: AbortSignal.timeout(5_000) });
      stage = 'Script execution';
      const command = await sandbox.runCommand({
        cmd: python ? 'python3' : 'node',
        args: python ? ['-B', '-s', input.entry] : ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--', input.entry],
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
    const previewUrl = new URL(sandbox.domain(PREVIEW_PORT));
    const expiresAt = sandbox.expiresAt;
    if (previewUrl.protocol !== 'https:' || !/^[a-z0-9-]+\.vercel\.run$/.test(previewUrl.hostname) || !expiresAt) {
      throw new PlaygroundRunError('Preview is unavailable.');
    }
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
    for (let retry = 0; retry < 20; retry++) {
      // Accept only a successful response on the declared port, and do not follow redirects.
      const probe = await sandbox.runCommand('curl', [
        '--noproxy', '*', '--silent', '--output', '/dev/null', '--fail', '--max-time', '1',
        '--header', `Host: ${previewUrl.hostname}`, `http://127.0.0.1:${PREVIEW_PORT}/`,
      ], { timeoutMs: 2_000 });
      if (probe.exitCode === 0) {
        keepPreview = true;
        return { kind: 'preview' as const, runId, previewUrl: previewUrl.href, expiresAt: expiresAt.toISOString() };
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new PlaygroundRunError('Vite did not become ready on port 4173. Check the dev script.', await collect(server));
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
