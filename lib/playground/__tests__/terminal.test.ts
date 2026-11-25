/** @jest-environment node */
import { applyTerminalChanges, parseTerminalCommand, parseTerminalInput, resolveTerminalDirectory } from '../terminal';

it('recognizes the exact official initializer and a safe custom output folder', () => {
  expect(parseTerminalCommand('npm create @gravity-ui')).toEqual({ kind: 'create', folder: 'gravity-app' });
  expect(parseTerminalCommand('npm create @gravity-ui -- --out demo-42')).toEqual({ kind: 'create', folder: 'demo-42' });
  expect(parseTerminalCommand('npm install @gravity-ui/uikit@^7.0.0 react')).toEqual({
    kind: 'install', packages: ['@gravity-ui/uikit@^7.0.0', 'react'],
  });
  expect(parseTerminalCommand('npm install')).toEqual({ kind: 'install', packages: [] });
});

it.each([
  'npm install; npm install react', 'npm install ./local', 'npm install https://example.test/a.tgz',
  'npm install --registry=https://example.test', 'npm install react && node index.js',
  'npm create @gravity-ui -- --out ../other', 'npm create @gravity-ui -- --out /tmp/out',
  'npm create vite', 'npm run dev',
])('rejects unsupported command or operands: %s', (input) => {
  expect(parseTerminalCommand(input)).toBeNull();
});

it('accepts only the two clean-room manifests for npm install and no existing files for create', () => {
  const config = [{ name: '.npmrc', content: 'registry=https://example.test' }];
  const manifests = [{ name: 'package.json', content: '{}' }];
  expect(parseTerminalInput({ command: 'npm install react', manifests: config })).toBeNull();
  expect(parseTerminalInput({ command: 'npm create @gravity-ui', manifests })).toBeNull();
  expect(parseTerminalInput({ command: 'npm install react', manifests })?.manifests).toEqual(manifests);
});

const original = { entry: 'main.js', folders: ['packages'], files: [{ name: 'main.js', content: 'untouched' }] };
it('synchronizes generated projects into a directory without losing the existing draft', () => {
  const changes = { folders: ['demo', 'demo/entries'], files: [{ name: 'demo/entries/app.tsx', content: 'example' }] };
  const command = { kind: 'create' as const, folder: 'demo' };
  const next = applyTerminalChanges(original, 'packages', command, changes);
  expect(next).toEqual({
    folders: ['packages', 'packages/demo', 'packages/demo/entries'], entry: 'packages/demo/entries/app.tsx',
    files: [...original.files, { name: 'packages/demo/entries/app.tsx', content: 'example' }],
  });
  expect(applyTerminalChanges(next!, 'packages', command, changes)).toBeNull();
  expect(applyTerminalChanges(original, 'packages', command, { ...changes, files: original.files })).toBeNull();
  expect(resolveTerminalDirectory('packages/demo', '..', next!.folders)).toBe('packages');
});

it('applies only install manifest changes to the current directory', () => {
  const result = applyTerminalChanges(original, 'packages', { kind: 'install', packages: ['react'] }, {
    folders: [], files: [{ name: 'package.json', content: '{"dependencies":{"react":"18"}}' }],
  });
  expect(result?.files[0]).toEqual(original.files[0]);
  expect(result?.files[1].name).toBe('packages/package.json');
  expect(result?.entry).toBe(original.entry);
});

it('validates Gravity wizard choices on the server without accepting CLI flags or custom registries', () => {
  const setup = { folder: 'test', language: 'js', frontend: false, react: false, styles: false, backend: true };
  const request = { command: 'npm create @gravity-ui', manifests: [], setup };
  expect(parseTerminalInput(request)).toMatchObject({
    command: { kind: 'create', folder: 'test', options: { language: 'js', frontend: false, backend: true } },
  });
  for (const invalid of [
    { folder: '../bad' }, { registry: 'https://example.com' }, { react: true }, { language: 'bash' },
  ]) expect(parseTerminalInput({ ...request, setup: { ...setup, ...invalid } })).toBeNull();
  expect(parseTerminalInput({ ...request, command: 'npm install react' })).toBeNull();
});
