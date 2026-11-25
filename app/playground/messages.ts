import english from './Playground.i18n/en.json';

export type MessageKey = keyof typeof english extends `playground.${infer Key}` ? Key : never;
type Params = Record<string, string | number>;

export function translatePlayground(t: (key: string) => string, key: MessageKey, params: Params = {}) {
  return t(`playground.${key}`).replace(/\{(\w+)\}/g, (match, param: string) =>
    Object.prototype.hasOwnProperty.call(params, param) ? String(params[param]) : match);
}

const apiErrors: MessageKey[] = [
  'badInput', 'deploymentDisabled', 'slotBusy', 'dailyLimit', 'timeLimit', 'sandboxFailed',
  'quotaUnavailable', 'packageMissing', 'lockfileMissing', 'previewUnavailable', 'viteNotReady', 'htmlNotReady',
  'workspaceNpmManifestMissing', 'workspaceNpmInvalidManifest', 'workspaceNpmReservedPath',
];
const stages: MessageKey[] = [
  'sandboxCreation', 'networkIsolation', 'workspaceCreation', 'writeFiles', 'scriptExecution', 'githubImport', 'install', 'previewStartup',
];

export function translateRunError(t: (key: string) => string, message: string) {
  const translate = (key: MessageKey, params?: Params) => translatePlayground(t, key, params);
  if (message === 'No active session') return translate('signInToRun');
  const key = apiErrors.find((candidate) => english[`playground.${candidate}`] === message);
  if (key) return translate(key);
  const stageError = /^(.+) failed(?: \(exit (-?\d+)\)\.|\. No cloud result was returned\.)$/.exec(message);
  if (stageError) {
    const stage = stages.find((candidate) => english[`playground.${candidate}`] === stageError[1]);
    if (stage) return translate(stageError[2] === undefined ? 'stageFailed' : 'stageExit', {
      stage: translate(stage), code: stageError[2] ?? '',
    });
  }
  return translate('runFailed');
}
