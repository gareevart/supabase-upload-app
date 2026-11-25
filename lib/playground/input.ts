import { parseWorkspaceDraft, runnableKind, type SourceFile } from './workspace';

import { MAX_TERMINAL_BYTES, parseTerminalInput, TERMINAL_RESERVE_MS, type TerminalInput } from './terminal';

export { MAX_FILES, type SourceFile } from './workspace';
export const MAX_CODE_BYTES = MAX_TERMINAL_BYTES; // combined workspace content
export const MAX_REQUEST_BYTES = 3_250 * 1024;
export const PREVIEW_PORT = 4173;
export const PREVIEW_MS = 10 * 60 * 1000;
export const WORKSPACE_MS = 30_000;

export type PlaygroundBudget = {
  enabled: boolean;
  remainingSeconds: number;
  totalSeconds: number;
  remainingStarts: number;
  dailyStarts: number;
  active: boolean;
  dailyResetAt: string;
};

export type WorkspaceRun = { mode: 'files'; entry: string; files: SourceFile[]; folders?: string[] };

export type RunInput =
  | WorkspaceRun
  | TerminalInput
  | { mode: 'github'; repo: string; directory: string };

export function runDurationMs(input: RunInput) {
  if (input.mode === 'npm') return TERMINAL_RESERVE_MS;
  return input.mode === 'github' || runnableKind(input.entry) === 'html' ? PREVIEW_MS : WORKSPACE_MS;
}

export function isSandboxPreviewUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      /^[a-z0-9-]+\.vercel\.run$/.test(url.hostname);
  } catch { return false; }
}

export function parseWorkspace(input: Record<string, unknown>, maxBytes = MAX_CODE_BYTES): WorkspaceRun | null {
  const workspace = parseWorkspaceDraft(input, maxBytes);
  if (!workspace || !runnableKind(workspace.entry)) return null;
  const { files, folders, entry } = workspace;
  return { mode: 'files', entry, files, ...(folders.length ? { folders } : {}) };
}

export function parseRunInput(value: unknown): RunInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.mode === 'npm') return parseTerminalInput(input);
  if (input.mode === 'files') return parseWorkspace(input);
  // Accept requests from old Playground tabs until they are reloaded.
  if (input.mode === 'javascript' && typeof input.code === 'string') {
    return parseWorkspace({ entry: 'main.js', files: [{ name: 'main.js', content: input.code }] });
  }
  if (input.mode !== 'github' || typeof input.repo !== 'string' || input.repo.length > 230) return null;
  const match = /^https:\/\/github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9_.-]{1,100})\/?$/.exec(input.repo.trim());
  if (!match) return null;
  const name = match[2].replace(/\.git$/, '');
  if (!name || name === '.' || name === '..' || name.startsWith('-')) return null;
  const directory = input.directory === undefined ? '' : input.directory;
  if (typeof directory !== 'string' || directory.length > 200 ||
      (directory !== '' && !directory.split('/').every((part) =>
        /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part)))) return null;
  return { mode: 'github', repo: `https://github.com/${match[1]}/${name}.git`, directory };
}

export function validRunId(id: unknown): id is string {
  return typeof id === 'string' && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/.test(id);
}

export async function readBoundedJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') {
    throw new Error('JSON required.');
  }
  if (!request.body || Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) {
    throw new Error('Invalid request size.');
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let length = 0;
  let body = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      length += value.byteLength;
      if (length > MAX_REQUEST_BYTES) throw new Error('Request is too large.');
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
