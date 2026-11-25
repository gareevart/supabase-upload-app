import { isWorkspacePath, type Workspace } from './workspace';

export type LinuxChange =
  | { kind: 'file'; path: string; before: string | null; after: string | null }
  | { kind: 'folder'; path: string; create: boolean };

export function workspaceChanges(before: Workspace, after: Workspace): LinuxChange[] {
  const oldFiles = new Map(before.files.map((file) => [file.name, file.content]));
  const newFiles = new Map(after.files.map((file) => [file.name, file.content]));
  const paths = new Set([...oldFiles.keys(), ...newFiles.keys()]);
  const changes: LinuxChange[] = [];
  for (const path of paths) {
    const old = oldFiles.get(path) ?? null;
    const next = newFiles.get(path) ?? null;
    if (old !== next) changes.push({ kind: 'file', path, before: old, after: next });
  }
  for (const path of before.folders) if (!after.folders.includes(path)) changes.push({ kind: 'folder', path, create: false });
  for (const path of after.folders) if (!before.folders.includes(path)) changes.push({ kind: 'folder', path, create: true });
  return changes;
}

export function mergeChanges(previous: LinuxChange[], next: LinuxChange[]): LinuxChange[] {
  const all = new Map(previous.map((change) => [change.path, change]));
  for (const change of next) {
    const original = all.get(change.path);
    if (original?.kind === 'file' && change.kind === 'file') {
      if (original.before === change.after) all.delete(change.path);
      else all.set(change.path, { ...change, before: original.before });
    } else if (original?.kind === 'folder' && change.kind === 'folder' && original.create !== change.create) {
      all.delete(change.path);
    } else {
      all.set(change.path, change);
    }
  }
  return [...all.values()];
}

const excluded = new Set(['node_modules', '.git', '.next', 'dist', '.cache', 'coverage', '__pycache__']);
export function parseLinuxChanges(value: unknown): LinuxChange[] | null {
  if (!Array.isArray(value) || !value.length || value.length > 400) return null;
  const paths = new Set<string>();
  const changes: LinuxChange[] = [];
  for (const item of value) {
    if (!item || !isWorkspacePath(item.path) || item.path.split('/').some((part: string) => excluded.has(part))) return null;
    if (paths.has(item.path)) return null;
    paths.add(item.path);
    if (item.kind === 'folder' && typeof item.create === 'boolean') changes.push({kind: 'folder', path: item.path, create: item.create});
    else if (item.kind === 'file' && (item.before === null || typeof item.before === 'string') &&
        (item.after === null || typeof item.after === 'string') && item.before !== item.after) {
      changes.push({kind: 'file', path: item.path, before: item.before, after: item.after});
    } else return null;
  }
  return changes;
}
