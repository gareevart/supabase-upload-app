import { includesPath, runnableKind, type SourceFile } from './workspace';

export const NPM_REGISTRY = 'https://registry.npmjs.org/';
export const NPM_INSTALL_TIMEOUT_MS = 15_000;
export const WORKSPACE_NPM_CI_ARGS = [
  'ci', '--ignore-scripts', '--no-audit', '--no-fund', '--workspaces=false',
  '--allow-git=none', '--allow-file=none', '--allow-directory=none', '--allow-remote=none',
  '--userconfig=./.empty-npmrc', '--globalconfig=/dev/null', `--registry=${NPM_REGISTRY}`,
];
export const NPM_MANIFEST_MISSING = 'Add package.json and package-lock.json to the workspace root.';
export const NPM_INVALID_MANIFEST = 'Use valid package.json and npm v2 or v3 package-lock.json files with public npm registry dependencies only.';
export const NPM_RESERVED_PATH = 'Remove the node_modules file or folder from the workspace root. It is created by npm.';
const PACKAGE_JSON = 'package.json';
const LOCKFILE = 'package-lock.json';
const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'] as const;
const namePart = '[a-zA-Z0-9_][a-zA-Z0-9_.-]*';
const packageName = `(?:@${namePart}/)?${namePart}`;
const validName = new RegExp(`^${packageName}$`);
const validInstallPath = new RegExp(`^(?:node_modules/${packageName}/)*node_modules/${packageName}$`);
const validTarball = new RegExp(`^https://registry\\.npmjs\\.org/${packageName}/-/${namePart}\\.tgz$`);
// Only registry tags/ranges. No aliases, URLs, git, local dependencies, or workspace protocols.
const validSpec = /^[a-zA-Z0-9*~^<>=][a-zA-Z0-9.*~^<>=+| -]*$/;
const validIntegrity = /^sha512-[A-Za-z0-9+/]{86}==$/;

type Files = { entry: string; files: SourceFile[]; folders?: string[] };
type NpmPlan = { manifests: [SourceFile, SourceFile] } | { error: string } | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parse(content: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(content);
    return isRecord(value) ? value : null;
  } catch { return null; }
}

function dependenciesValid(manifest: Record<string, unknown>) {
  return dependencyFields.every((key) => !Object.hasOwn(manifest, key) ||
    (isRecord(manifest[key]) && Object.entries(manifest[key]).every(
      ([name, spec]) => validName.test(name) && typeof spec === 'string' && validSpec.test(spec),
    )));
}

export function planWorkspaceNpm({ entry, files, folders = [] }: Files): NpmPlan {
  if (runnableKind(entry) !== 'node') return null;
  const manifest = files.find(({ name }) => name === PACKAGE_JSON);
  const lockfile = files.find(({ name }) => name === LOCKFILE);
  if (!manifest) return lockfile ? { error: NPM_MANIFEST_MISSING } : null;

  const pkg = parse(manifest.content);
  if (!pkg || !dependenciesValid(pkg)) return { error: NPM_INVALID_MANIFEST };
  const hasDependencies = dependencyFields.some((key) => isRecord(pkg[key]) && Object.keys(pkg[key]).length > 0);
  if (!lockfile) return hasDependencies ? { error: NPM_MANIFEST_MISSING } : null;

  const lock = parse(lockfile.content);
  if (Object.hasOwn(pkg, 'workspaces') || Object.hasOwn(pkg, 'overrides') ||
      !lock || (lock.lockfileVersion !== 2 && lock.lockfileVersion !== 3) || !isRecord(lock.packages) ||
      !isRecord(lock.packages['']) || !dependenciesValid(lock.packages['']) ||
      !Object.entries(lock.packages).every(([path, item]) => path === '' ||
        (validInstallPath.test(path) && isRecord(item) && !item.link &&
          typeof item.resolved === 'string' && validTarball.test(item.resolved) &&
          typeof item.integrity === 'string' && validIntegrity.test(item.integrity) &&
          typeof item.version === 'string' && validSpec.test(item.version) && dependenciesValid(item)))) {
    return { error: NPM_INVALID_MANIFEST };
  }

  if ([...folders, ...files.map(({ name }) => name)].some((name) => includesPath('node_modules', name))) {
    return { error: NPM_RESERVED_PATH };
  }
  return { manifests: [manifest, lockfile] };
}
