import type { Sandbox } from '@vercel/sandbox';
import { isSandboxPreviewUrl } from './input';
import { DEV_PORTS } from './dev-port-options';
export { DEV_PORTS } from './dev-port-options';
const UPDATE_TIMEOUT_MS = 8_000;

export function devPort(value: unknown): number | null {
  return typeof value === 'number' && DEV_PORTS.some((port) => port === value) ? value : null;
}

export class DevPortError extends Error {}

function routeAddress(sandbox: Sandbox, port: number) {
  const address = sandbox.domain(port);
  if (!isSandboxPreviewUrl(address)) throw new DevPortError('Sandbox did not provide a valid preview URL.');
  const url = new URL(address);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new DevPortError('Sandbox did not provide a valid preview URL.');
  }
  return url.href;
}

/**
 * Publish one HTTP port from an already running, authenticated user-owned
 * sandbox. The application must bind 0.0.0.0 for the public proxy to connect.
 * The response is a public URL, not an access-controlled application route.
 */
export async function publishDevPort(sandbox: Sandbox, port: number): Promise<string> {
  if (devPort(port) === null) throw new DevPortError('This preview port is not supported.');
  if (sandbox.status !== 'running') throw new DevPortError('The terminal session is no longer running.');

  // Empty the curl config search, ignore proxies, use only loopback HTTP,
  // and never follow redirects. A 404/redirect still proves HTTP is listening.
  // Probe the current Session, not Sandbox.runCommand, which can auto-resume.
  const probe = await sandbox.currentSession().runCommand({
    cmd: 'curl',
    args: [
      '-q', '--noproxy', '*', '--proto', '=http', '--head', '--silent', '--output', '/dev/null',
      '--connect-timeout', '1', '--max-time', '2', `http://127.0.0.1:${port}/`,
    ],
    timeoutMs: 3_000,
  });
  if (probe.exitCode !== 0) {
    throw new DevPortError(`No HTTP server is responding on port ${port}. Start it on 0.0.0.0 and try again.`);
  }

  // Sandbox.update treats this as the full desired list, not an append.
  const previousPorts = sandbox.routes.map((route) => route.port);
  if (previousPorts.length === 1 && previousPorts[0] === port) return routeAddress(sandbox, port);
  try {
    await sandbox.update({ ports: [port] }, { signal: AbortSignal.timeout(UPDATE_TIMEOUT_MS) });
    return routeAddress(sandbox, port);
  } catch (error) {
    // If the update succeeded at the provider before its response was lost, or
    // the returned URL fails validation, do not leave a newly opened port.
    try {
      await sandbox.update({ ports: previousPorts }, { signal: AbortSignal.timeout(UPDATE_TIMEOUT_MS) });
    } catch {
      throw new DevPortError('The preview could not be confirmed. Stop the terminal to close its public ports.');
    }
    if (error instanceof DevPortError) throw error;
    throw new DevPortError('Could not open the preview port.');
  }
}
