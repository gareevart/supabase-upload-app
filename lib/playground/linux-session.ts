export const LINUX_SESSION_MS = 600_000;
export const LINUX_RESERVE_SECONDS = LINUX_SESSION_MS / 1_000;
export const linuxSandboxName = (id: string) => `gareev-playground-terminal-${id}`;

export type LinuxSession = { runId: string; expiresAt: string };
export type LinuxTicket = { url: string; cwd: string };
export type LinuxStart = LinuxSession & LinuxTicket;

export function ptyUrl(endpoint: string, token?: string): URL | null {
  try {
    const url = new URL(endpoint);
    // The endpoint comes from the authenticated Vercel Sandbox SDK, never request data.
    if (url.protocol !== 'wss:' || url.username || url.password || url.hash || !url.hostname) return null;
    if (token !== undefined) {
      if (!token || token.length > 16_384) return null;
      url.searchParams.set('token', token);
    }
    return url;
  } catch { return null; }
}

export function bashStart(cwd: string, cols: number, rows: number) {
  return {
    type: 'start', command: '/bin/bash', args: ['--noprofile', '--norc', '-i'],
    env: ['TERM=xterm-256color', 'PS1=\\w $ ', '__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.vercel.run'],
    cwd, cols, rows,
  };
}
