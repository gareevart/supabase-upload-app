'use client';

import '@xterm/xterm/css/xterm.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Text } from '@gravity-ui/uikit';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { authFetch } from '@/lib/auth-fetch';
import { isSandboxPreviewUrl, MAX_CODE_BYTES, validRunId } from '@/lib/playground/input';
import { bashStart, LINUX_SESSION_MS, ptyUrl, type LinuxSession, type LinuxTicket } from '@/lib/playground/linux-session';
import { parseWorkspaceDraft, type Workspace } from '@/lib/playground/workspace';
import { DEV_PORTS } from '@/lib/playground/dev-port-options';
import type { MessageKey } from './messages';
import styles from './playground.module.css';

const STORAGE = 'gareev-playground-linux-v1';
const API = '/api/playground/session';
type Ops = 'start' | 'connect' | 'publish' | 'unpublish' | 'snapshot' | 'stop';
type Props = {
  workspace: Workspace; blocked: boolean; published: boolean;
  msg: (key: MessageKey, params?: Record<string, string | number>) => string;
  onActive: (active: boolean) => void;
  onSync: (workspace: Workspace) => void;
  onPort: (port: { url: string; number: number } | null) => void;
  onBudget: () => void;
};

export function lastLinuxSession(): LinuxSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(STORAGE) ?? 'null');
    return validRunId(value?.runId) && Number.isFinite(Date.parse(value?.expiresAt)) && Date.parse(value.expiresAt) > Date.now()
      ? { runId: value.runId, expiresAt: value.expiresAt } : null;
  } catch { return null; }
}

function remember(session: LinuxSession | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE);
  } catch { /* session still works without storage */ }
}

class RequestError extends Error {
  constructor(readonly status: number) { super('Linux session request failed'); }
}

async function action(body: Record<string, unknown>) {
  let res: Response;
  try {
    res = await authFetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  } catch (err) {
    if (err instanceof Error && err.message === 'No active session') throw new RequestError(401);
    throw err;
  }
  if (!res.ok) throw new RequestError(res.status);
  return res.json();
}

export default function LinuxTerminal({ workspace, blocked, published, msg, onActive, onSync, onPort, onBudget }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const terminal = useRef<Terminal>();
  const fitter = useRef<FitAddon>();
  const socket = useRef<WebSocket>();
  const ptyStarted = useRef(false);
  const [session, setSession] = useState<LinuxSession | null>(null);
  const [op, setOp] = useState<Ops | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const [port, setPort] = useState<number>(5173);
  const [saveFailed, setSaveFailed] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [screenReady, setScreenReady] = useState(false);
  const busy = useRef(false);

  const disconnect = useCallback(() => {
    const activeSocket = socket.current;
    socket.current = undefined;
    ptyStarted.current = false;
    if (activeSocket) activeSocket.close();
    setConnected(false);
  }, []);

  const reset = useCallback(() => {
    disconnect();
    remember(null);
    setSession(null);
    setSaveFailed(false);
    setJustSynced(false);
    onPort(null);
    onBudget();
  }, [disconnect, onBudget, onPort]);

  useEffect(() => { setSession(lastLinuxSession()); }, []);
  useEffect(() => { onActive(Boolean(session || op === 'start')); }, [onActive, session, op]);
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) { reset(); setError('linuxExpired'); }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [session, reset]);

  useEffect(() => {
    let dead = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]).then(([xterm, fit]) => {
      if (dead || !element.current) return;
      const term = new xterm.Terminal({
        cursorBlink: true, convertEol: false, scrollback: 1500, fontSize: 13,
        theme: { background: '#151719', foreground: '#eef1f3', cursor: '#eef1f3' },
        linkHandler: { activate: () => {} },
      });
      const addon = new fit.FitAddon();
      term.loadAddon(addon);
      term.open(element.current);
      terminal.current = term;
      fitter.current = addon;
      const syncSize = () => {
        if (!element.current?.clientWidth || !element.current.clientHeight) return;
        addon.fit();
      };
      const observer = new ResizeObserver(syncSize);
      observer.observe(element.current);
      syncSize();
      const data = term.onData((input) => {
        if (ptyStarted.current && socket.current?.readyState === WebSocket.OPEN && socket.current.bufferedAmount < 262_144) {
          socket.current.send(new TextEncoder().encode(input));
        }
      });
      const resize = term.onResize(({ cols, rows }) => {
        if (ptyStarted.current && socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      });
      setScreenReady(true);
      cleanup = () => { observer.disconnect(); data.dispose(); resize.dispose(); term.dispose(); terminal.current = undefined; fitter.current = undefined; };
    }).catch(() => { if (!dead) setError('linuxConnectionFailed'); });
    return () => {
      dead = true;
      const activeSocket = socket.current;
      socket.current = undefined;
      if (activeSocket) activeSocket.close();
      cleanup?.();
    };
  }, []);

  function connect(value: Partial<LinuxTicket>) {
    const safe = typeof value.url === 'string' ? ptyUrl(value.url) : null;
    if (!safe?.searchParams.get('token') || typeof value.cwd !== 'string' || !value.cwd.startsWith('/') || !terminal.current) {
      throw new Error('Invalid PTY ticket.');
    }
    const cwd = value.cwd;
    disconnect();
    const ws = new WebSocket(safe.href);
    ws.binaryType = 'arraybuffer';
    socket.current = ws;
    const timeout = window.setTimeout(() => {
      if (socket.current === ws && ws.readyState !== WebSocket.OPEN) {
        disconnect();
        setError('linuxConnectionFailed');
      }
    }, 12_000);
    ws.onopen = () => {
      window.clearTimeout(timeout);
      if (socket.current !== ws || !terminal.current) return;
      fitter.current?.fit();
      const term = terminal.current;
      term.clear();
      ws.send(JSON.stringify(bashStart(cwd, term.cols, term.rows)));
      ptyStarted.current = true;
      setConnected(true);
      term.focus();
    };
    ws.onmessage = (message) => {
      if (socket.current !== ws) return;
      if (message.data instanceof ArrayBuffer) {
        terminal.current?.write(new Uint8Array(message.data));
        return;
      }
      if (typeof message.data !== 'string') return;
      try {
        const control = JSON.parse(message.data);
        if (control.type === 'exit') {
          terminal.current?.writeln('\r\n[exit]');
          disconnect();
        }
      } catch { terminal.current?.write(message.data); }
    };
    ws.onerror = () => { if (socket.current === ws) setError('linuxConnectionFailed'); };
    ws.onclose = (event) => {
      window.clearTimeout(timeout);
      if (socket.current !== ws) return;
      socket.current = undefined;
      ptyStarted.current = false;
      setConnected(false);
      if (!event.wasClean) setError('linuxConnectionFailed');
    };
  }

  function perform(kind: Ops, run: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setOp(kind);
    setError(null);
    setJustSynced(false);
    void run().catch((err) => {
      if (err instanceof RequestError && err.status === 404 && kind !== 'start') { reset(); setError('linuxExpired'); }
      else if (err instanceof RequestError && err.status === 401) setError('signInToRun');
      else setError(kind === 'publish' ? 'linuxPortFailed' : kind === 'unpublish' ? 'linuxClosePortFailed' : kind === 'snapshot' ? 'linuxSyncFailed' :
        kind === 'stop' ? 'linuxStopFailed' : kind === 'start' && err instanceof RequestError && err.status === 429 ?
          'terminalBudget' : 'linuxConnectionFailed');
    }).finally(() => { busy.current = false; setOp(null); });
  }

  function start() {
    perform('start', async () => {
      const details = await action({ action: 'start', workspace });
      if (!validRunId(details.runId) || !Number.isFinite(Date.parse(details.expiresAt)) ||
          Date.parse(details.expiresAt) <= Date.now() || Date.parse(details.expiresAt) > Date.now() + LINUX_SESSION_MS + 30_000) {
        throw new Error('Invalid session expiry.');
      }
      const active = { runId: details.runId, expiresAt: details.expiresAt };
      remember(active);
      setSession(active);
      onBudget();
      connect(details);
    });
  }

  async function sync(active: LinuxSession) {
    const data = await action({ action: 'snapshot', runId: active.runId });
    const draft = parseWorkspaceDraft(data.workspace, MAX_CODE_BYTES);
    if (!draft) throw new Error('Invalid workspace snapshot.');
    onSync(draft);
  }

  function stop(discard = false) {
    if (!session) return;
    const active = session;
    perform('stop', async () => {
      if (!discard) {
        try { await sync(active); }
        catch (err) {
          if (err instanceof RequestError && err.status === 404) throw err;
          setSaveFailed(true);
          setError('linuxSyncFailed');
          return;
        }
      }
      await action({ action: 'stop', runId: active.runId });
      reset();
    });
  }

  return (
    <div className={styles.linuxTerminal}>
      {!session && <div className={styles.linuxSetup}>
        <Text variant="body-1">{msg('linuxHint')}</Text>
        <Button view="action" size="s" loading={op === 'start'} disabled={blocked || !screenReady} onClick={start}>{msg('linuxStart')}</Button>
      </div>}
      {session && <div className={styles.linuxControls}>
        <Text variant="caption-2" color="secondary">{msg('sandboxExpires', { time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` })}</Text>
        {!connected && <Button size="s" disabled={!!op || !screenReady} onClick={() =>
          perform('connect', async () => { connect(await action({ action: 'connect', runId: session.runId })); })}>{msg('linuxReconnect')}</Button>}
        <Button size="s" disabled={!!op} onClick={() =>
          perform('snapshot', async () => { await sync(session); setSaveFailed(false); setJustSynced(true); })}>{msg('linuxSync')}</Button>
        <Button size="s" disabled={!!op} onClick={() => stop()}>{msg('linuxStop')}</Button>
        {saveFailed && <Button size="s" view="outlined-danger" disabled={!!op} onClick={() => stop(true)}>{msg('linuxDiscard')}</Button>}
        <select aria-label={msg('linuxPort')} value={port} disabled={!!op} onChange={(event) => setPort(Number(event.target.value))}>
          {DEV_PORTS.map((available) => <option key={available} value={available}>{available}</option>)}
        </select>
        <Button size="s" disabled={!!op} onClick={() => perform('publish', async () => {
          const data = await action({ action: 'publish', runId: session.runId, port });
          if (!isSandboxPreviewUrl(data.url)) throw new Error('Unexpected port origin.');
          onPort({ url: data.url, number: port });
        })}>{msg('linuxOpenPort')}</Button>
        {published && <Button size="s" disabled={!!op} onClick={() => perform('unpublish', async () => {
          await action({ action: 'unpublish', runId: session.runId });
          onPort(null);
        })}>{msg('linuxClosePort')}</Button>}
      </div>}
      {error && <Alert theme="danger" message={msg(error)} />}
      {justSynced && <Text variant="caption-2" color="secondary" role="status">{msg('linuxSynced')}</Text>}
      <div ref={element} className={styles.linuxViewport} data-active={!!session} aria-label={msg('linuxTerminal')} />
    </div>
  );
}
