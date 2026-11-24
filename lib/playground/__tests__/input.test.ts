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
  expect(parseRunInput({ mode: 'javascript', code: '  ' })).toBeNull();
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
