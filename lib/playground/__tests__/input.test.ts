/** @jest-environment node */
import { MAX_CODE_BYTES, MAX_REQUEST_BYTES, parseRunInput, readBoundedJson } from '../input';

it('canonicalizes a GitHub repo without sending other user-controlled URLs to the VM', () => {
  expect(parseRunInput({ mode: 'github', repo: 'https://github.com/gareevart/ui-builder/', directory: 'apps/editor' }))
    .toEqual({ mode: 'github', repo: 'https://github.com/gareevart/ui-builder.git', directory: 'apps/editor' });
});

it.each(['https://github.com.evil.test/owner/repo', 'http://github.com/a/b', 'https://user@github.com/a/b',
  'https://github.com/a/b?query=1', 'https://github.com/a/b/tree/main', 'https://github.com/a/%2E%2E',
  'https://github.com/a/-bad', 'https://github.com/a/..git'])('rejects invalid imports: %s', (repo) => {
  expect(parseRunInput({ mode: 'github', repo })).toBeNull();
});

it.each(['../app', '/app', 'apps/..', 'apps//site', 'apps\\site', 'apps/%2e%2e', '.git'])
  ('rejects invalid directory %s', (directory) => {
    expect(parseRunInput({ mode: 'github', repo: 'https://github.com/a/b', directory })).toBeNull();
  });

it('bounds code by UTF-8 rather than characters', () => {
  expect(parseRunInput({ mode: 'javascript', code: 'я'.repeat(MAX_CODE_BYTES / 2) })).not.toBeNull();
  expect(parseRunInput({ mode: 'javascript', code: 'я'.repeat(MAX_CODE_BYTES / 2 + 1) })).toBeNull();
  expect(parseRunInput({ mode: 'javascript', code: '' })).not.toBeNull();
});

it('bounds the actual body even with no content-length', async () => {
  const req = new Request('https://example.test', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: ' '.repeat(MAX_REQUEST_BYTES + 1),
  });
  expect(req.headers.get('content-length')).toBeNull();
  await expect(readBoundedJson(req)).rejects.toThrow('too large');
});

it('reads supported JSON', async () => {
  const req = new Request('https://example.test', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ code: 'console.log("привет")' }),
  });
  await expect(readBoundedJson(req)).resolves.toEqual({ code: 'console.log("привет")' });
});


it('accepts a mixed set of files and a selected entry, including empty new files', () => {
  const request = { mode: 'files', entry: 'demo.py', files: [
    { name: 'test.js', content: '' }, { name: 'main.ts', content: 'const a: number = 2;' }, { name: 'demo.py', content: 'print(2)' },
  ] };
  expect(parseRunInput(request)).toEqual(request);
  expect(parseRunInput({ ...request, entry: 'missing.js' })).toBeNull();
});

it.each(['../main.js', './main.js', '/main.ts', 'dir/main.py', 'a\\b.js', 'a.js\n'])
  ('rejects invalid names or files without an existing parent folder: %s', (name) => {
    expect(parseRunInput({ mode: 'files', entry: 'main.js', files: [
      { name: 'main.js', content: '' }, { name, content: '' },
    ] })).toBeNull();
  });

it('rejects duplicate names including case collisions, plus aggregate byte and file-count overages', () => {
  const main = { name: 'main.js', content: 'a' };
  for (const others of [
    [{ name: 'MAIN.js', content: '' }],
    [{ name: 'large.py', content: 'x'.repeat(MAX_CODE_BYTES) }],
    Array.from({ length: 20 }, (_, i) => ({ name: `extra${i}.js`, content: '' })),
  ]) expect(parseRunInput({ mode: 'files', entry: 'main.js', files: [main, ...others] })).toBeNull();
});

it('accepts a nested entry, arbitrary text files, and explicit empty directories', () => {
  const input = { mode: 'files', entry: 'src/nested/main.mjs', folders: ['src', 'src/nested', 'empty'], files: [
    { name: 'src/nested/main.mjs', content: '' },
    { name: 'src/nested/settings.json', content: '{}' },
    { name: 'README', content: 'Hello' },
  ] };
  expect(parseRunInput(input)).toEqual(input);
  expect(parseRunInput({ ...input, entry: 'README' })).toBeNull();
  expect(parseRunInput({ ...input, folders: ['src/nested'] })).toBeNull();
  expect(parseRunInput({ ...input, folders: [...input.folders, 'README'] })).toBeNull();
});

it.each(['../outside', 'foo/../../outside', '/absolute', 'foo//bar', 'foo/.', 'foo\\bar', 'foo\u0000'])(
  'rejects workspace paths outside or invalid for the workspace: %p', (folder) => {
    expect(parseRunInput({ mode: 'files', entry: 'main.js', files: [{ name: 'main.js', content: '' }], folders: [folder] })).toBeNull();
  },
);
