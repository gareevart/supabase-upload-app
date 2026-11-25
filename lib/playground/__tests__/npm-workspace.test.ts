import lock from './fixtures/npm-lock.json';
import { NPM_INVALID_MANIFEST, NPM_MANIFEST_MISSING, NPM_RESERVED_PATH, planWorkspaceNpm } from '../npm-workspace';

const pkg = { name: 'workspace-smoke', private: true, type: 'module', dependencies: { 'is-number': '7.0.0' } };
const manifest = { name: 'package.json', content: JSON.stringify(pkg) };
const lockfile = { name: 'package-lock.json', content: JSON.stringify(lock) };
const entry = 'src/main.ts';

it('recognizes a registry lock at the project root even when the entry is nested', () => {
  expect(planWorkspaceNpm({ entry, files: [manifest, lockfile] })).toEqual({ manifests: [manifest, lockfile] });
  expect(planWorkspaceNpm({ entry, files: [manifest, { ...lockfile, content: JSON.stringify({ ...lock, lockfileVersion: 2 }) }] }))
    .toEqual(expect.objectContaining({ manifests: expect.any(Array) }));
});

it('preserves no-dependency, Python, HTML and nested-only manifest runs', () => {
  expect(planWorkspaceNpm({ entry, files: [{ name: 'package.json', content: '{"type":"commonjs"}' }] })).toBeNull();
  expect(planWorkspaceNpm({ entry, files: [{ ...manifest, name: 'src/package.json' }] })).toBeNull();
  expect(planWorkspaceNpm({ entry: 'main.py', files: [manifest] })).toBeNull();
  expect(planWorkspaceNpm({ entry: 'index.html', files: [manifest] })).toBeNull();
});

it('requires the root manifest and lock together before installing', () => {
  expect(planWorkspaceNpm({ entry, files: [manifest] })).toEqual({ error: NPM_MANIFEST_MISSING });
  expect(planWorkspaceNpm({ entry, files: [lockfile] })).toEqual({ error: NPM_MANIFEST_MISSING });
});

it.each([
  'file:./local', 'git+https://github.com/a/b', 'a/b', 'npm:other@1.0.0', 'https://example.net/p.tgz', 'workspace:*',
])('rejects a non-registry dependency declaration (%s)', (spec) => {
  expect(planWorkspaceNpm({ entry, files: [
    { ...manifest, content: JSON.stringify({ ...pkg, devDependencies: { example: spec } }) }, lockfile,
  ] })).toEqual({ error: NPM_INVALID_MANIFEST });
});

it.each([
  { resolved: 'https://registry.npmjs.org.example.net/is-number/-/is-number-7.0.0.tgz' },
  { resolved: 'http://registry.npmjs.org/is-number/-/is-number-7.0.0.tgz' },
  { integrity: '' }, { link: true }, { dependencies: { example: 'file:./local' } },
])('rejects unsupported package lock metadata (%j)', (patch) => {
  const packages = { ...lock.packages, 'node_modules/is-number': { ...lock.packages['node_modules/is-number'], ...patch } };
  expect(planWorkspaceNpm({ entry, files: [
    manifest, { ...lockfile, content: JSON.stringify({ ...lock, packages }) },
  ] })).toEqual({ error: NPM_INVALID_MANIFEST });
});

it('rejects non-package lock paths and workspace content that collides with installed modules', () => {
  const packages = { ...lock.packages, '../example': lock.packages['node_modules/is-number'] };
  expect(planWorkspaceNpm({ entry, files: [
    manifest, { ...lockfile, content: JSON.stringify({ ...lock, packages }) },
  ] })).toEqual({ error: NPM_INVALID_MANIFEST });
  expect(planWorkspaceNpm({ entry, files: [manifest, lockfile], folders: ['node_modules'] }))
    .toEqual({ error: NPM_RESERVED_PATH });
});
