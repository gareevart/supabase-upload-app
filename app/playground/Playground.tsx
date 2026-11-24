'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import CodeEditor from './CodeEditor';
import { authFetch } from '@/lib/auth-fetch';
import { isSourceName, MAX_CODE_BYTES, MAX_FILES, parseRunInput, parseWorkspace, PREVIEW_MS, WORKSPACE_MS, type PlaygroundBudget, type SourceFile } from '@/lib/playground/input';
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

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
}

export default function Playground() {
  const [mode, setMode] = useState<'files' | 'github'>('files');
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [newFileName, setNewFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const [repo, setRepo] = useState('');
  const [directory, setDirectory] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [budget, setBudget] = useState<PlaygroundBudget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [budgetRefresh, refreshBudget] = useState(0);
  const preview = result?.kind === 'preview' ? result : null;
  const activeFile = workspace.files.find((file) => file.name === workspace.entry);
  const encoder = new TextEncoder();
  const bytes = workspace.files.reduce((total, file) => total + encoder.encode(file.content).length, 0);
  const tooLarge = bytes > MAX_CODE_BYTES;
  const budgetBlocked = budget !== null && (
    !budget.enabled || budget.remainingStarts === 0 ||
    budget.remainingSeconds < (mode === 'github' ? PREVIEW_MS : WORKSPACE_MS) / 1_000 ||
    (budget.active && !preview)
  );

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

  useEffect(() => {
    const controller = new AbortController();
    let running = false;
    async function loadBudget() {
      if (running || document.visibilityState === 'hidden') return;
      running = true;
      try {
        const response = await fetch('/api/playground', { signal: controller.signal });
        if (!response.ok) throw new Error();
        const next: PlaygroundBudget = await response.json();
        if (!controller.signal.aborted) {
          setBudget(next);
          setBudgetStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) {
          setBudget(null);
          setBudgetStatus('unavailable');
        }
      } finally {
        running = false;
      }
    }
    void loadBudget();
    const timer = window.setInterval(loadBudget, 15_000);
    document.addEventListener('visibilitychange', loadBudget);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', loadBudget);
    };
  }, [budgetRefresh]);

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
    setCreatingFile(false);
  }

  function removeActiveFile() {
    if (!activeFile || !window.confirm(`Delete ${activeFile.name} from this workspace?`)) return;
    const files = workspace.files.filter((file) => file.name !== activeFile.name);
    updateWorkspace({ files, entry: files[0]?.name ?? '' });
  }

  async function run(event?: FormEvent) {
    event?.preventDefault();
    if (busy || preview || budgetBlocked || (mode === 'files' && (!activeFile || tooLarge))) return;
    setBusy(true);
    setShowConsole(true);
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
      setError(message === 'No active session' ? 'Sign in with your gareev.de account to run code.' :
        message || 'Could not start the sandbox.');
    } finally {
      setBusy(false);
      refreshBudget((version) => version + 1);
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
      refreshBudget((version) => version + 1);
    }
  }

  const runDisabled = busy || budgetBlocked || (mode === 'files' ? tooLarge || !activeFile : !repo.trim());
  const runLabel = mode === 'github' ? 'Import and run' : activeFile ? `Run ${activeFile.name}` : 'Run file';
  const previewExpired = preview ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : null;
  const output = result?.kind === 'output' ? result : null;
  const language = activeFile?.name.endsWith('.py') ? 'Python' : activeFile?.name.endsWith('.ts') ? 'TypeScript' : 'JavaScript';

  function pickFile(name: string) {
    updateWorkspace({ ...workspace, entry: name });
  }

  function updateFile(content: string) {
    if (!activeFile) return;
    updateWorkspace({ ...workspace, files: workspace.files.map((file) =>
      file.name === activeFile.name ? { ...file, content } : file) });
  }

  return (
    <main className={styles.shell}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <Link href="/projects" className={styles.back} aria-label="Back to Projects">Projects</Link>
          <span aria-hidden="true" className={styles.slash}>/</span>
          <h1>Playground</h1>
        </div>
        <div className={styles.toolbarActions}>
          <details className={styles.budget}>
            <summary aria-label="Shared Sandbox budget" title="Show shared sandbox budget">
              <span className={styles.dot} data-on={budget?.enabled && !budgetBlocked} />
              {budget ? formatTime(budget.remainingSeconds) : 'Shared budget'}
            </summary>
            <div className={styles.budgetPopover}>
              <strong>Shared Sandbox budget</strong>
              {budgetStatus === 'loading' && <p>Loading budget…</p>}
              {budgetStatus === 'unavailable' && <p>Budget temporarily unavailable.</p>}
              {budget && <>
                <progress aria-label="Shared runtime remaining" max={budget.totalSeconds} value={budget.remainingSeconds} />
                <p>{Math.round(budget.totalSeconds / 3600)}h every 30 days · <strong>{budget.remainingStarts}/{budget.dailyStarts}</strong> starts left today</p>
                <p>Shared by all users. Daily starts reset at 00:00 UTC.</p>
                {budget.active && <p>One sandbox is currently in use.</p>}
                {!budget.enabled && <p>Cloud runs are disabled on this deployment.</p>}
              </>}
            </div>
          </details>
          {preview ? (
            <button type="button" className={styles.ghost} disabled={busy} onClick={() => void stop()}>■ Stop preview</button>
          ) : (
            <button type="button" className={styles.run} aria-label={runLabel} disabled={runDisabled}
              onClick={() => void run()} title={`${runLabel} · Ctrl/⌘ Enter`}>
              <span aria-hidden="true">▶</span> {busy ? 'Running…' : mode === 'github' ? 'Import & run' : 'Run'}
            </button>
          )}
        </div>
      </header>

      <div className={styles.activity}>
        <div className={styles.source} aria-label="Project source">
          <button type="button" className={styles.ghost} disabled={busy || !!preview} aria-pressed={mode === 'files'}
            onClick={() => setMode('files')}>Workspace</button>
          <button type="button" className={styles.ghost} disabled={busy || !!preview} aria-pressed={mode === 'github'}
            onClick={() => setMode('github')}>GitHub / Vite</button>
        </div>
        <div className={styles.activityTools}>
          <button type="button" className={styles.ghost} aria-expanded={showExplorer} onClick={() => setShowExplorer(!showExplorer)}>Explorer</button>
          <button type="button" className={styles.ghost} aria-expanded={showConsole} onClick={() => setShowConsole(!showConsole)}>Console</button>
          <Link href="/auth" onClick={() => {
            try { window.sessionStorage.setItem('returnUrl', '/projects/playground'); } catch { /* Optional. */ }
          }}>Sign in</Link>
        </div>
      </div>

      <div className={styles.workbench} data-explorer={showExplorer}>
        {showExplorer && <aside className={styles.explorer} aria-label="Explorer">
          <div className={styles.sideHeading}>
            <h2>{mode === 'files' ? 'Explorer' : 'Repository'}</h2>
            {mode === 'files' && <button type="button" className={styles.icon} aria-label="New file" title="New file"
              disabled={busy} onClick={() => { setCreatingFile(!creatingFile); setFileError(''); }}>＋</button>}
          </div>
          {mode === 'files' ? (
            <>
              <div className={styles.treeHeading}><span aria-hidden="true">⌄</span> PROJECT FILES</div>
              {creatingFile && <form className={styles.createFile} onSubmit={(event) => { event.preventDefault(); addFile(); }}>
                <input autoFocus aria-label="New filename" placeholder="example.ts" value={newFileName} disabled={busy}
                  onChange={(event) => { setNewFileName(event.target.value); setFileError(''); }}
                  onKeyDown={(event) => { if (event.key === 'Escape') { setCreatingFile(false); setFileError(''); } }} />
                <button type="submit" className={styles.ghost} disabled={busy}>Create</button>
              </form>}
              {fileError && <p role="alert" className={styles.fileError}>{fileError}</p>}
              <ul className={styles.files} aria-label="Workspace files">
                {workspace.files.map((file) => (
                  <li key={file.name}>
                    <button type="button" className={styles.file} aria-pressed={workspace.entry === file.name}
                      onClick={() => pickFile(file.name)} disabled={busy}>
                      <FileBadge name={file.name} /> <span>{file.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!workspace.files.length && !creatingFile && <p className={styles.sidebarNote}>No files yet. Add a .js, .ts, or .py file.</p>}
            </>
          ) : (
            <form className={styles.repoForm} onSubmit={run}>
              <label>Public repository <input type="url" required placeholder="https://github.com/owner/repo" value={repo}
                disabled={busy || !!preview} onChange={(event) => setRepo(event.target.value)} /></label>
              <label>App folder <input placeholder="Optional, e.g. apps/editor" value={directory}
                disabled={busy || !!preview} onChange={(event) => setDirectory(event.target.value)} /></label>
              <button type="button" className={styles.ghost} disabled={busy || !!preview} onClick={() => {
                setRepo(GRAVITY_EXAMPLE); setDirectory('');
              }}>Use Gravity UI example</button>
              <p>Vite app with an npm or pnpm lockfile. Preview links are public until they expire. Do not use secrets.</p>
            </form>
          )}
        </aside>}

        <section className={styles.editArea} aria-label={mode === 'files' ? 'Editor' : 'App preview'} data-console={showConsole}>
          <div className={styles.tabs} aria-label="Open files">
            {mode === 'files' && workspace.files.map((file) => (
              <button type="button" key={file.name} className={styles.tab} aria-pressed={file.name === workspace.entry}
                disabled={busy} onClick={() => pickFile(file.name)}>
                <FileBadge name={file.name} /> {file.name}
              </button>
            ))}
            {mode === 'github' && <span className={styles.previewTab}>⌘ App preview</span>}
          </div>
          <div className={styles.canvas}>
            {mode === 'files' && (activeFile ? (
              <CodeEditor name={activeFile.name} value={activeFile.content} disabled={busy} onChange={updateFile} onRun={() => void run()} />
            ) : (
              <div className={styles.blank}>
                <strong>No open file</strong>
                <span>Select a file or create a new one in the Explorer.</span>
                <button className={styles.ghost} type="button" onClick={() => { setShowExplorer(true); setCreatingFile(true); }}>New file</button>
              </div>
            ))}
            {mode === 'github' && (preview ? (
              <iframe className={styles.preview} sandbox="allow-scripts allow-same-origin" title="Sandbox preview"
                src={preview.previewUrl} referrerPolicy="no-referrer" />
            ) : (
              <div className={styles.blank}>
                <strong>No running app</strong>
                <span>Import a Vite project from the Explorer to preview it here.</span>
              </div>
            ))}
          </div>
          {showConsole && <section className={styles.console} aria-label="Console" aria-busy={busy}>
            <div className={styles.consoleHead}>
              <h2>Console</h2>
              <div>
                {preview && <a href={preview.previewUrl} target="_blank" rel="noopener noreferrer">Open ↗</a>}
                {output && <button type="button" className={styles.ghost} onClick={() => setResult(null)}>Clear</button>}
              </div>
            </div>
            <div className={styles.consoleBody} aria-live="polite">
              {error && <p role="alert" className={styles.error}>{error}</p>}
              {logs && <pre>{logs}</pre>}
              {busy && !preview && <p role="status">› {mode === 'github' ? 'Importing, installing, and starting Vite…' : 'Starting cloud sandbox…'}</p>}
              {!result && !error && !busy && <p className={styles.muted}>Run the active file to see its output here.</p>}
              {output && <>
                <p className={output.exitCode === 0 ? styles.success : styles.error}>{output.entry} · Exit code: {output.exitCode}</p>
                <pre>{output.output || 'No output.'}</pre>
              </>}
              {preview && <p className={styles.success}>Preview running · expires in {previewExpired}</p>}
            </div>
          </section>}
        </section>
      </div>

      <footer className={styles.statusbar} aria-label="Workspace status">
        <div>
          <span>{mode === 'files' ? '● Local draft' : '● Vercel Sandbox'}</span>
          {tooLarge && mode === 'files' && <span role="alert" className={styles.error}>Workspace exceeds 64 KiB</span>}
          {mode === 'files' && activeFile && <button type="button" className={styles.ghost} disabled={busy}
            onClick={removeActiveFile}>Delete active file</button>}
        </div>
        <div>{mode === 'files' && <><span>{activeFile ? language : 'No file'}</span><span>UTF-8</span><span>Ctrl/⌘ Enter to run</span></>}</div>
      </footer>
    </main>
  );
}

function FileBadge({ name }: { name: string }) {
  const extension = name.slice(-2);
  return <span className={styles.fileBadge} data-language={extension} aria-hidden="true">{extension.toUpperCase()}</span>;
}
