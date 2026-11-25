import type { Command, Sandbox } from '@vercel/sandbox';
import { posix } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { MAX_REQUEST_BYTES } from './input';
import { NPM_REGISTRY, WORKSPACE_NPM_CI_ARGS } from './npm-workspace';
import { TERMINAL_EXPORT } from './terminal-export';
import { GRAVITY_DEFAULTS, GRAVITY_GENERATOR, MAX_TERMINAL_BYTES, type TerminalInput } from './terminal';
import { parseWorkspaceDraft } from './workspace';

type Runner = {
  stage: (stage: string) => void;
  collect: (command: Command) => Promise<string>;
  check: (stage: string, command: Command) => Promise<void>;
};

const env = {
  COREPACK_ENABLE_PROJECT_SPEC: '0',
  npm_config_manage_package_manager_versions: 'false',
  npm_config_fetch_retries: '0',
  npm_config_fetch_timeout: '45000',
  npm_config_engine_strict: 'false',
  npm_config_color: 'false',
  NO_COLOR: '1',
};
const npmOptions = WORKSPACE_NPM_CI_ARGS.slice(1);
const npmOutput = (text: string) => stripVTControlCharacters(text).replace(/\r\n?/g, '\n')
  .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, '');

export async function runNpmTerminal(sandbox: Sandbox, work: string, input: TerminalInput, runner: Runner) {
  const source = posix.join(work, 'workspace');
  const { command } = input;
  let output = '';
  runner.stage('Workspace creation');
  await runner.check('Workspace creation', await sandbox.runCommand({
    cmd: 'mkdir', args: ['--', 'workspace'], cwd: work, timeoutMs: 3_000,
  }));

  if (command.kind === 'create') {
    runner.stage('Project generation');
    const { language, frontend, styles, react, backend } = command.options ?? GRAVITY_DEFAULTS;
    const flag = (name: string, enabled: boolean) => enabled ? `--${name}` : `--no-${name}`;
    const generated = await sandbox.runCommand({
      cmd: 'npm',
      args: [`--registry=${NPM_REGISTRY}`, '--yes', '--ignore-scripts', '--no-audit', '--no-fund',
        '--userconfig=./.empty-npmrc', '--globalconfig=/dev/null',
        'create', GRAVITY_GENERATOR, '--', '--out', command.folder, '--language', language,
        flag('frontend', frontend), flag('styles', styles), flag('react', react), flag('backend', backend), '--yes'],
      cwd: source, env, timeoutMs: 30_000,
    });
    output = npmOutput(await runner.collect(generated));
    if (generated.exitCode !== 0) return { kind: 'terminal' as const, output, exitCode: generated.exitCode };
  } else if (input.manifests.length) {
    runner.stage('Writing workspace files');
    await sandbox.writeFiles(input.manifests.map(({ name, content }) => ({
      path: `workspace/${name}`, content: Buffer.from(content),
    })), { signal: AbortSignal.timeout(5_000) });
  }

  runner.stage('Dependency install');
  const install = await sandbox.runCommand({
    cmd: 'npm', args: ['install', ...npmOptions, '--', ...(command.kind === 'install' ? command.packages : [])],
    cwd: command.kind === 'create' ? posix.join(source, command.folder) : source,
    env, timeoutMs: command.kind === 'create' ? 105_000 : 95_000,
  });
  output += `${output ? '\n$ npm install\n' : ''}${npmOutput(await runner.collect(install))}`;
  if (install.exitCode !== 0) return { kind: 'terminal' as const, output, exitCode: install.exitCode };

  runner.stage('Network isolation');
  await sandbox.update({ networkPolicy: 'deny-all' }, { signal: AbortSignal.timeout(5_000) });
  runner.stage('Project export');
  await runner.check('Project export', await sandbox.runCommand({
    cmd: 'node', args: ['--input-type=commonjs', '-e', TERMINAL_EXPORT, command.kind, command.kind === 'create' ? command.folder : ''],
    cwd: source, timeoutMs: 5_000,
  }));
  const stream = await sandbox.readFile({ path: posix.join(work, 'terminal-result.json') }, { signal: AbortSignal.timeout(8_000) });
  if (!stream) throw new Error('Missing terminal export.');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const value of stream) {
    const chunk = Buffer.from(value);
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES) throw new Error('Terminal export too large.');
    chunks.push(chunk);
  }
  const raw = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const changes = parseWorkspaceDraft({ ...raw, entry: raw?.files?.[0]?.name ?? '' }, MAX_TERMINAL_BYTES);
  if (!changes?.files.length) throw new Error('Invalid terminal export.');
  return { kind: 'terminal' as const, output, exitCode: 0, changes: { files: changes.files, folders: changes.folders } };
}
