export const MAX_CODE_BYTES = 64 * 1024;
export const MAX_REQUEST_BYTES = 400 * 1024;
export const PREVIEW_PORT = 4173;
export const PREVIEW_MS = 10 * 60 * 1000;

export type RunInput =
  | { mode: 'javascript'; code: string }
  | { mode: 'github'; repo: string; directory: string };

export function parseRunInput(value: unknown): RunInput | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (input.mode === 'javascript') {
    return typeof input.code === 'string' && input.code.trim() &&
      new TextEncoder().encode(input.code).length <= MAX_CODE_BYTES
      ? { mode: 'javascript', code: input.code }
      : null;
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
