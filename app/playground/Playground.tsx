'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Text } from '@gravity-ui/uikit';
import { authFetch } from '@/lib/auth-fetch';
import { isSourceName, MAX_CODE_BYTES, MAX_FILES, parseRunInput, parseWorkspace, type SourceFile } from '@/lib/playground/input';
import styles from './playground.module.css';

const DRAFT = 'gareev-playground-files-v2';
const LEGACY_DRAFT = 'gareev-playground-draft-v1';
const ACTIVE = 'gareev-playground-run-v1';
const DRAFT_TTL = 60 * 60 * 1000;
const GRAVITY_EXAMPLE = 'https://github.com/gravity-ui/gravity-ui-vite-example';
const STARTER = "const ideas = ['design', 'build', 'try'];\nconsole.log(ideas.map((idea) => idea.toUpperCase()));";
type Preview = { kind: 'preview'; previewUrl: string; expiresAt: string; runId: string };
type Result = Preview | { kind: 'output'; output: string; exitCode: number; entry: string };
type Workspace = { files: SourceFile[]; entry: string };
const DEFAULT_WORKSPACE: Workspace = { files: [{ name: 'main.js', content: STARTER }], entry: 'main.js' };

function cached<T>(key: string): T | null {
  try { return JSON.parse(sessionStorage.getItem(key) ?? 'null') as T | null; }
  catch { return null; }
}

function cache(key: string, value: unknown) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch { /* The runner still works when browser storage is disabled. */ }
}

export default function Playground() {
  const [mode, setMode] = useState<'files' | 'github'>('files');
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [newFileName, setNewFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [repo, setRepo] = useState('');
  const [directory, setDirectory] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState('');
  const [remaining, setRemaining] = useState(0);
  const preview = result?.kind === 'preview' ? result : null;
  const activeFile = workspace.files.find((file) => file.name === workspace.entry);
  const encoder = new TextEncoder();
  const bytes = workspace.files.reduce((total, file) => total + encoder.encode(file.content).length, 0);
  const tooLarge = bytes > MAX_CODE_BYTES;

  useEffect(() => {
    const draft = cached<Workspace & { expires: number }>(DRAFT);
    if (draft && draft.expires > Date.now()) {
      const restored = parseWorkspace(draft, Infinity); // Drafts can be edited even above the run limit.
      if (restored?.mode === 'files') setWorkspace({ files: restored.files, entry: restored.entry });
      else if (Array.isArray(draft.files) && draft.files.length === 0 && draft.entry === '') {
        setWorkspace({ files: [], entry: '' });
      }
    } else {
      cache(DRAFT, null);
      const legacy = cached<{ code: string; expires: number }>(LEGACY_DRAFT);
      const restored = legacy && legacy.expires > Date.now() ? parseRunInput({ mode: 'javascript', code: legacy.code }) : null;
      if (restored?.mode === 'files' && legacy) {
        const migrated = { files: restored.files, entry: restored.entry };
        setWorkspace(migrated);
        cache(DRAFT, { ...migrated, expires: legacy.expires });
      }
      cache(LEGACY_DRAFT, null);
    }
    const active = cached<Preview>(ACTIVE);
    if (active?.kind === 'preview' && Date.parse(active.expiresAt) > Date.now()) {
      setResult(active);
      setMode('github');
    } else cache(ACTIVE, null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(preview.expiresAt) - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        setResult(null);
        cache(ACTIVE, null);
        setError('Preview expired. Start a new run to open it again.');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [preview]);

  function updateWorkspace(next: Workspace) {
    setWorkspace(next);
    cache(DRAFT, { ...next, expires: Date.now() + DRAFT_TTL });
  }

  function addFile() {
    const name = newFileName.trim();
    if (!isSourceName(name)) {
      setFileError('Use a filename such as main.js, example.ts, or script.py.');
      return;
    }
    if (workspace.files.some((file) => file.name.toLowerCase() === name.toLowerCase())) {
      setFileError('A file with that name already exists.');
      return;
    }
    if (workspace.files.length >= MAX_FILES) {
      setFileError(`This workspace can contain up to ${MAX_FILES} files.`);
      return;
    }
    updateWorkspace({ files: [...workspace.files, { name, content: '' }], entry: name });
    setNewFileName('');
    setFileError('');
  }

  function removeActiveFile() {
    if (!activeFile || !window.confirm(`Delete ${activeFile.name} from this workspace?`)) return;
    const files = workspace.files.filter((file) => file.name !== activeFile.name);
    updateWorkspace({ files, entry: files[0]?.name ?? '' });
  }

  async function run(event: FormEvent) {
    event.preventDefault();
    if (busy || preview || (mode === 'files' && (!activeFile || tooLarge))) return;
    setBusy(true);
    setError('');
    setLogs('');
    setResult(null);
    try {
      const response = await authFetch('/api/playground', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'github' ? { mode, repo, directory } : { mode, ...workspace }),
      });
      const data = await response.json();
      if (!response.ok) {
        setLogs(typeof data.logs === 'string' ? data.logs : '');
        throw new Error(data.error ?? 'Run failed.');
      }
      if (data.kind === 'preview') {
        cache(ACTIVE, data);
        setResult(data);
      } else {
        setResult({ ...data, entry: workspace.entry });
      }
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : '';
      setError(message === 'No active session' ? 'Sign in with a beta account to run code.' :
        message || 'Could not start the sandbox.');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!preview || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await authFetch(`/api/playground?runId=${encodeURIComponent(preview.runId)}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error();
      setResult(null);
      cache(ACTIVE, null);
    } catch {
      setError('Could not confirm Stop. The preview will expire automatically.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <Text variant="caption-2" color="secondary">PRIVATE BETA</Text>
        <Text as="h1" variant="display-2">Cloud Playground</Text>
        <Text as="p" color="secondary">
          Run an experiment in a temporary cloud sandbox. <Link href="/auth">Sign in</Link> with a beta account to run code.
        </Text>
      </header>

      <div className={styles.workspace}>
        <form onSubmit={run} className={styles.panel}>
          <fieldset className={styles.options} disabled={busy || Boolean(preview)}>
            <legend>Source</legend>
            <label><input type="radio" name="source" checked={mode === 'files'} onChange={() => setMode('files')} /> Workspace</label>
            <label><input type="radio" name="source" checked={mode === 'github'} onChange={() => setMode('github')} /> GitHub / Vite</label>
          </fieldset>

          {mode === 'files' ? (
            <>
              <div className={styles.fileManager}>
                <Text as="h2" variant="header-1">Files</Text>
                <ul className={styles.files} aria-label="Workspace files">
                  {workspace.files.map((file) => (
                    <li key={file.name}>
                      <Button type="button" size="m" aria-pressed={workspace.entry === file.name}
                        view={workspace.entry === file.name ? 'normal' : 'flat'} disabled={busy}
                        onClick={() => updateWorkspace({ ...workspace, entry: file.name })}>{file.name}</Button>
                    </li>
                  ))}
                </ul>
                <div className={styles.createFile}>
                  <input aria-label="New filename" placeholder="example.ts" value={newFileName} disabled={busy}
                    onChange={(event) => { setNewFileName(event.target.value); setFileError(''); }}
                    onKeyDown={(event) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addFile(); } }} />
                  <Button type="button" size="m" onClick={addFile} disabled={busy}>New file</Button>
                </div>
                {fileError && <p role="alert" className={styles.error}>{fileError}</p>}
              </div>
              {activeFile ? (
                <>
                  <label className={styles.field}>
                    {activeFile.name}
                    <textarea className={styles.editor} rows={13} value={activeFile.content} spellCheck={false}
                      autoCapitalize="off" autoCorrect="off" disabled={busy}
                      onChange={(event) => {
                        const content = event.target.value;
                        updateWorkspace({ ...workspace, files: workspace.files.map((file) =>
                          file.name === activeFile.name ? { ...file, content } : file) });
                      }} />
                  </label>
                  <Button type="button" size="s" view="flat" disabled={busy} onClick={removeActiveFile}>
                    Delete active file
                  </Button>
                </>
              ) : <Text as="p" color="secondary">Create a .js, .ts, or .py file to start.</Text>}
              <Text as="p" variant="caption-2" color="secondary">
                Up to 20 files and 64 KiB. Drafts stay in this tab for up to an hour. Runs are offline.
              </Text>
              {tooLarge && <p role="alert" className={styles.error}>Workspace exceeds 64 KiB.</p>}
            </>
          ) : (
            <>
              <label className={styles.field}>
                Public GitHub repository URL
                <input type="url" required value={repo} onChange={(event) => setRepo(event.target.value)}
                  disabled={busy || Boolean(preview)} placeholder="https://github.com/owner/repository" />
              </label>
              <label className={styles.field}>
                App directory (optional)
                <input value={directory} onChange={(event) => setDirectory(event.target.value)}
                  disabled={busy || Boolean(preview)} placeholder="apps/editor" />
                <small>Use a Vite dev script and a root npm or pnpm lockfile. The default branch is imported.</small>
              </label>
              <Button size="m" type="button" disabled={busy || Boolean(preview)}
                onClick={() => { setRepo(GRAVITY_EXAMPLE); setDirectory(''); }}>Use Gravity UI example</Button>
              <Text as="p" color="secondary">Anyone with the preview link can open it until it expires. Do not import secrets.</Text>
            </>
          )}

          {preview ? (
            <Button size="l" type="button" loading={busy} onClick={stop}>Stop preview</Button>
          ) : (
            <Button size="l" view="action" type="submit" loading={busy}
              disabled={busy || (mode === 'files' && (tooLarge || !activeFile))}>
              {mode === 'github' ? 'Import and run' : activeFile ? `Run ${activeFile.name}` : 'Run file'}
            </Button>
          )}
        </form>

        <section className={styles.panel} aria-label="Run result" aria-busy={busy}>
          <Text as="h2" variant="header-1">{preview ? 'Preview' : 'Run result'}</Text>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          {logs && <pre className={styles.output}>{logs}</pre>}
          {busy && !preview && <p role="status">{mode === 'github' ? 'Importing, installing, and starting Vite…' : 'Running in the cloud…'}</p>}
          {!result && !error && !busy && <Text as="p" color="secondary">Results appear here after a run.</Text>}
          {result?.kind === 'output' && <>
            <Text as="p" color={result.exitCode === 0 ? 'positive' : 'danger'}>{result.entry} · Exit code: {result.exitCode}</Text>
            <pre className={styles.output}>{result.output || 'No output.'}</pre>
          </>}
          {preview && <>
            <Text as="p" color="secondary">Preview expires in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}.</Text>
            <a href={preview.previewUrl} target="_blank" rel="noopener noreferrer">Open preview in a new tab ↗</a>
            <iframe className={styles.preview} sandbox="allow-scripts allow-same-origin" title="Sandbox preview"
              src={preview.previewUrl} referrerPolicy="no-referrer" />
          </>}
        </section>
      </div>
    </main>
  );
}
