export const MAX_FILES = 20;
export const MAX_FOLDERS = 100;
const MAX_PATH_BYTES = 240;
export const MAX_NAME_BYTES = 100;
const MAX_DEPTH = 10;
const comparablePath = (path: string) => path.normalize('NFC').toLowerCase();

export type SourceFile = { name: string; content: string };
export type Workspace = { files: SourceFile[]; entry: string; folders: string[] };
export type WorkspaceNode = { path: string; kind: 'file' | 'folder' };
type WorkspaceProblem = 'invalidFilename' | 'duplicateFilename' | 'invalidDestination' | 'tooManyFiles' | 'tooManyFolders';
type Mutation = { workspace: Workspace; path: string } | { error: WorkspaceProblem };

export const leafName = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const parentPath = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf('/')));
export const joinPath = (folder: string, name: string) => folder ? `${folder}/${name}` : name;
export const includesPath = (parent: string, path: string) => path === parent || path.startsWith(parent + '/');

export function isWorkspaceName(name: unknown): name is string {
  return typeof name === 'string' && name.length > 0 && name.length <= MAX_NAME_BYTES && name === name.trim() &&
    name !== '.' && name !== '..' && !/[\\/:"*?<>|\p{Cc}\p{Cs}]/u.test(name) &&
    new TextEncoder().encode(name).length <= MAX_NAME_BYTES;
}

export function isWorkspacePath(path: unknown): path is string {
  if (typeof path !== 'string' || path.length > MAX_PATH_BYTES || new TextEncoder().encode(path).length > MAX_PATH_BYTES) return false;
  const parts = path.split('/');
  return parts.length <= MAX_DEPTH && parts.every(isWorkspaceName);
}

export function runnableKind(path: string): 'python' | 'node' | 'html' | null {
  if (/\.html?$/i.test(path)) return 'html';
  if (/\.py$/i.test(path)) return 'python';
  return /\.(?:[cm]?[jt]s)$/.test(path) ? 'node' : null;
}

export function parseWorkspaceDraft(value: unknown, maxBytes = Infinity): Workspace | null {
  if (!value || typeof value !== 'object') return null;
  const { files: rawFiles, folders: rawFolders = [], entry } = value as Record<string, unknown>;
  if (!Array.isArray(rawFiles) || rawFiles.length > MAX_FILES ||
      !Array.isArray(rawFolders) || rawFolders.length > MAX_FOLDERS || typeof entry !== 'string') return null;

  const seen = new Set<string>();
  const exactFolders = new Set<string>();
  const folders: string[] = [];
  const files: SourceFile[] = [];
  const encoder = new TextEncoder();
  let bytes = 0;
  for (const path of rawFolders) {
    if (!isWorkspacePath(path) || seen.has(comparablePath(path))) return null;
    seen.add(comparablePath(path));
    exactFolders.add(path);
    folders.push(path);
  }
  const hasParent = (path: string) => !parentPath(path) || exactFolders.has(parentPath(path));
  if (!folders.every(hasParent)) return null;
  for (const file of rawFiles) {
    if (!file || !isWorkspacePath(file.name) || typeof file.content !== 'string' ||
        seen.has(comparablePath(file.name)) || !hasParent(file.name)) return null;
    seen.add(comparablePath(file.name));
    bytes += encoder.encode(file.content).length;
    if (bytes > maxBytes) return null;
    files.push({ name: file.name, content: file.content });
  }
  if (files.length ? !files.some(({ name }) => name === entry) : entry !== '') return null;
  return { entry, files, folders };
}

function occupied(workspace: Workspace, path: string, ignore?: WorkspaceNode) {
  const same = (existing: string) => comparablePath(existing) === comparablePath(path);
  return workspace.folders.some((folder) => !(ignore?.kind === 'folder' && includesPath(ignore.path, folder)) && same(folder)) ||
    workspace.files.some(({ name }) => !(ignore && (ignore.kind === 'folder' ? includesPath(ignore.path, name) : name === ignore.path)) && same(name));
}

export function createWorkspaceNode(workspace: Workspace, parent: string, name: string, kind: WorkspaceNode['kind']): Mutation {
  if (parent && !workspace.folders.includes(parent)) return { error: 'invalidDestination' };
  const path = joinPath(parent, name);
  if (!isWorkspaceName(name) || !isWorkspacePath(path)) return { error: 'invalidFilename' };
  if (occupied(workspace, path)) return { error: 'duplicateFilename' };
  if (kind === 'folder') {
    if (workspace.folders.length >= MAX_FOLDERS) return { error: 'tooManyFolders' };
    return { path, workspace: { ...workspace, folders: [...workspace.folders, path] } };
  }
  if (workspace.files.length >= MAX_FILES) return { error: 'tooManyFiles' };
  return { path, workspace: { ...workspace, files: [...workspace.files, { name: path, content: '' }], entry: path } };
}

export function relocateWorkspaceNode(workspace: Workspace, node: WorkspaceNode, parent: string, name: string): Mutation {
  const exists = node.kind === 'folder' ? workspace.folders.includes(node.path) : workspace.files.some(({ name }) => name === node.path);
  if (!exists || (parent && !workspace.folders.includes(parent)) ||
      (node.kind === 'folder' && includesPath(node.path, parent))) return { error: 'invalidDestination' };
  const path = joinPath(parent, name);
  if (!isWorkspaceName(name) || !isWorkspacePath(path)) return { error: 'invalidFilename' };
  if (occupied(workspace, path, node)) return { error: 'duplicateFilename' };
  const replace = (existing: string) =>
    (node.kind === 'folder' ? includesPath(node.path, existing) : existing === node.path)
      ? path + existing.slice(node.path.length) : existing;
  const folders = node.kind === 'folder' ? workspace.folders.map(replace) : workspace.folders;
  const files = workspace.files.map((file) => {
    const next = replace(file.name);
    return next === file.name ? file : { ...file, name: next };
  });
  if (!folders.every(isWorkspacePath) || !files.every(({ name }) => isWorkspacePath(name))) return { error: 'invalidFilename' };
  return { path, workspace: { folders, files, entry: replace(workspace.entry) } };
}

export function removeWorkspaceNode(workspace: Workspace, node: WorkspaceNode): Workspace {
  const removing = (path: string) => node.kind === 'folder' ? includesPath(node.path, path) : path === node.path;
  const files = workspace.files.filter(({ name }) => !removing(name));
  const folders = node.kind === 'folder' ? workspace.folders.filter((folder) => !removing(folder)) : workspace.folders;
  return { files, folders, entry: removing(workspace.entry) ? files[0]?.name ?? '' : workspace.entry };
}
