import { includesPath, isWorkspacePath, joinPath, parentPath, parseWorkspaceDraft, type SourceFile, type Workspace } from './workspace';

export const TERMINAL_RESERVE_MS = 600_000; // Existing quota tier; unused time is refunded on VM cleanup.
export const TERMINAL_VM_MS = 130_000;
export const MAX_TERMINAL_BYTES = 1_280 * 1024;
export const GRAVITY_GENERATOR = '@gravity-ui@1.0.1';
export const TERMINAL_MANIFESTS = ['package.json', 'package-lock.json'] as const;

export type TerminalCommand = { kind: 'create'; folder: string } | { kind: 'install'; packages: string[] };
export type TerminalInput = { mode: 'npm'; command: TerminalCommand; manifests: SourceFile[] };
export type TerminalChanges = Pick<Workspace, 'files' | 'folders'>;

export function parseTerminalCommand(value: unknown): TerminalCommand | null {
  if (typeof value !== 'string' || value.length > 320 || /[\u0000-\u001f\u007f]/.test(value)) return null;
  const tokens = value.trim().split(/ +/);
  if (tokens[0] !== 'npm') return null;
  if (tokens[1] === 'create' && tokens[2] === '@gravity-ui') {
    if (tokens.length === 3) return { kind: 'create', folder: 'gravity-app' };
    if (tokens.length === 6 && tokens[3] === '--' && tokens[4] === '--out' &&
        /^[a-z0-9][a-z0-9-]{0,63}$/.test(tokens[5])) return { kind: 'create', folder: tokens[5] };
    return null;
  }
  const packages = tokens.slice(2);
  if (tokens[1] !== 'install' || packages.length > 5 || !packages.every((pkg) =>
    /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*(?:@[a-zA-Z0-9~^*][a-zA-Z0-9.~^*+_-]*)?$/.test(pkg))) return null;
  return { kind: 'install', packages };
}

export function parseTerminalInput(body: Record<string, unknown>): TerminalInput | null {
  const command = parseTerminalCommand(body.command);
  if (!command || !Array.isArray(body.manifests) || body.manifests.length > (command.kind === 'create' ? 0 : 2)) return null;
  const manifests = parseWorkspaceDraft({
    files: body.manifests, entry: body.manifests[0]?.name ?? '', folders: [],
  }, MAX_TERMINAL_BYTES);
  if (!manifests || !manifests.files.every(({ name }) =>
    (TERMINAL_MANIFESTS as readonly string[]).includes(name))) return null;
  return { mode: 'npm', command, manifests: manifests.files };
}

export function terminalCanCreate(workspace: Workspace, cwd: string, folder: string) {
  const path = joinPath(cwd, folder).normalize('NFC').toLowerCase();
  return ![...workspace.folders, ...workspace.files.map(({ name }) => name)]
    .some((name) => includesPath(path, name.normalize('NFC').toLowerCase()));
}

export function applyTerminalChanges(
  workspace: Workspace, cwd: string, command: TerminalCommand, changes: TerminalChanges,
): Workspace | null {
  if (!Array.isArray(changes?.files) || !Array.isArray(changes?.folders) ||
      (cwd && !workspace.folders.includes(cwd))) return null;
  if (command.kind === 'create' && (!terminalCanCreate(workspace, cwd, command.folder) ||
      !changes.folders.includes(command.folder) || !changes.files.every(({ name }) => includesPath(command.folder, name)) ||
      !changes.folders.every((name) => includesPath(command.folder, name)))) return null;
  if (command.kind === 'install' && (changes.folders.length ||
      !changes.files.every(({ name }) => (TERMINAL_MANIFESTS as readonly string[]).includes(name)))) return null;

  const files = changes.files.map(({ name, content }) => ({ name: joinPath(cwd, name), content }));
  const folders = changes.folders.map((name) => joinPath(cwd, name));
  const replaced = new Set(files.map(({ name }) => name));
  const next = [...workspace.files.filter(({ name }) => !replaced.has(name)), ...files];
  const entry = command.kind === 'create'
    ? files.find(({ name }) => /\/entries\/[^/]+\.[jt]sx?$/.test(name))?.name ?? files[0]?.name
    : workspace.entry;
  return parseWorkspaceDraft({
    files: next, folders: [...workspace.folders, ...folders], entry: entry || files[0]?.name || '',
  }, MAX_TERMINAL_BYTES);
}

export function resolveTerminalDirectory(cwd: string, input: string, folders: string[]) {
  if (input === '/' || input === '~' || !input) return '';
  if (input === '.') return cwd;
  if (input === '..') return parentPath(cwd);
  const path = input.startsWith('/') ? input.slice(1) : joinPath(cwd, input.replace(/^\.\//, ''));
  return isWorkspacePath(path) && folders.includes(path) ? path : null;
}
