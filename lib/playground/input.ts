export const MAX_CODE_BYTES = 64 * 1024; // combined workspace content
export const MAX_FILES = 20;
export const MAX_REQUEST_BYTES = 400 * 1024;
export const PREVIEW_PORT = 4173;
export const PREVIEW_MS = 10 * 60 * 1000;

export type SourceFile = { name: string; content: string };
export type WorkspaceRun = { mode: 'files'; entry: string; files: SourceFile[] };

export type RunInput =
  | WorkspaceRun
  | { mode: 'github'; repo: string; directory: string };

export function isSourceName(name: unknown): name is string {
  return typeof name === 'string' && /^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,62}\.(js|ts|py)$(?![\s\S])/.test(name);
}

export function parseWorkspace(input: Record<string, unknown>, maxBytes = MAX_CODE_BYTES): WorkspaceRun | null {
  if (!isSourceName(input.entry) || !Array.isArray(input.files) || input.files.length === 0 ||
      input.files.length > MAX_FILES) return null;
  const files: SourceFile[] = [];
  const names = new Set<string>();
  const encoder = new TextEncoder();
  let bytes = 0;
  for (const file of input.files) {
    if (!file || !isSourceName(file.name) || typeof file.content !== 'string' ||
        names.has(file.name.toLowerCase())) return null;
    names.add(file.name.toLowerCase());
    bytes += encoder.encode(file.content).length;
    if (bytes > maxBytes) return null;
    files.push({ name: file.name, content: file.content });
  }
  if (!files.some((file) => file.name === input.entry)) return null;
  return { mode: 'files', entry: input.entry, files };
}

export function parseRunInput(value: unknown): RunInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
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
