'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import CodeEditor from './CodeEditor';
import {
  ActionTooltip, Alert, Breadcrumbs, Button, Dialog, Icon, Label, PlaceholderContainer, Popover, Progress,
  SegmentedRadioGroup, Spin, Tab, TabList, TabPanel, TabProvider, Text, TextInput, ThemeProvider,
} from '@gravity-ui/uikit';
import { ArrowUpRightFromSquare, Code, FolderOpen, PlayFill, Plus, Square, Terminal, TrashBin } from '@gravity-ui/icons';
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
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
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

  function confirmDelete() {
    if (!pendingDelete || busy) return;
    const files = workspace.files.filter((file) => file.name !== pendingDelete);
    updateWorkspace({ files, entry: workspace.entry === pendingDelete ? files[0]?.name ?? '' : workspace.entry });
    setPendingDelete(null);
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
    <ThemeProvider theme="dark" scoped>
      <main className={styles.shell}>
        <header className={styles.toolbar}>
          <Breadcrumbs className={styles.brand}>
            <Breadcrumbs.Item href="/projects">Projects</Breadcrumbs.Item>
            <Breadcrumbs.Item><Text as="h1" variant="subheader-2">Playground</Text></Breadcrumbs.Item>
          </Breadcrumbs>
          <div className={styles.toolbarActions}>
            <Popover trigger="click" placement="bottom-end" content={
              <div className={styles.budgetPopover}>
                <Text as="h2" variant="subheader-2">Shared Playground runtime</Text>
                {budgetStatus === 'loading' && <Text as="p" color="secondary">Loading budget…</Text>}
                {budgetStatus === 'unavailable' && <Text as="p" color="secondary">Budget temporarily unavailable.</Text>}
                {budget && <>
                  <Progress size="s" value={100 * budget.remainingSeconds / budget.totalSeconds} />
                  <Text as="p" variant="body-1">{Math.round(budget.totalSeconds / 3600)}h every 30 days · <strong>{budget.remainingStarts}/{budget.dailyStarts}</strong> starts left today</Text>
                  <Text as="p" variant="caption-2" color="secondary">Shared by all users. Daily starts reset at 00:00 UTC. Vercel meters its own limits separately.</Text>
                  {budget.active && <Label theme="info" size="xs">Sandbox in use</Label>}
                  {!budget.enabled && <Label theme="warning" size="xs">Cloud runs disabled</Label>}
                </>}
              </div>
            }>
              <Button view="outlined" size="m" aria-label="Shared Playground runtime">
                {budget ? formatTime(budget.remainingSeconds) : 'Shared runtime'}
              </Button>
            </Popover>
            {preview ? (
              <Button view="outlined" size="m" loading={busy} onClick={() => void stop()}>
                <Icon data={Square} size={14} /> Stop preview
              </Button>
            ) : (
              <ActionTooltip title={runLabel} hotkey="mod+enter">
                <Button view="action" size="m" aria-label={runLabel} disabled={runDisabled} loading={busy} onClick={() => void run()}>
                  <Icon data={PlayFill} size={14} /> {mode === 'github' ? 'Import & run' : 'Run'}
                </Button>
              </ActionTooltip>
            )}
          </div>
        </header>

        <div className={styles.activity}>
          <SegmentedRadioGroup size="m" value={mode} disabled={busy || !!preview}
            onUpdate={(value) => setMode(value)} aria-label="Project source"
            options={[{ value: 'files', content: 'Workspace' }, { value: 'github', content: 'GitHub / Vite' }]} />
          <div className={styles.activityTools}>
            <Button view="flat" size="s" selected={showExplorer} aria-expanded={showExplorer}
              onClick={() => setShowExplorer(!showExplorer)}><Icon data={FolderOpen} size={14} /> Explorer</Button>
            <Button view="flat" size="s" selected={showConsole} aria-expanded={showConsole}
              onClick={() => setShowConsole(!showConsole)}><Icon data={Terminal} size={14} /> Console</Button>
            <Button href="/auth" component={Link} view="flat" size="s" onClick={() => {
              try { window.sessionStorage.setItem('returnUrl', '/projects/playground'); } catch { /* Optional. */ }
            }}>Sign in</Button>
          </div>
        </div>

        <div className={styles.workbench} data-explorer={showExplorer}>
          {showExplorer && <aside className={styles.explorer} aria-label="Explorer">
            <div className={styles.sideHeading}>
              <Text as="h2" variant="caption-2">{mode === 'files' ? 'Explorer' : 'Repository'}</Text>
              {mode === 'files' && <ActionTooltip title="New file">
                <Button view="flat" size="s" aria-label="New file" disabled={busy}
                  onClick={() => { setCreatingFile(!creatingFile); setFileError(''); }}>
                  <Icon data={Plus} size={16} />
                </Button>
              </ActionTooltip>}
            </div>
            {mode === 'files' ? (
              <>
                <Text as="p" variant="caption-2" color="secondary" className={styles.treeHeading}>PROJECT FILES</Text>
                {creatingFile && <form className={styles.createFile} onSubmit={(event) => { event.preventDefault(); addFile(); }}>
                  <TextInput autoFocus size="s" controlProps={{ 'aria-label': 'New filename' }} placeholder="example.ts"
                    value={newFileName} disabled={busy} onUpdate={(value) => { setNewFileName(value); setFileError(''); }}
                    onKeyDown={(event) => { if (event.key === 'Escape') { setCreatingFile(false); setFileError(''); } }} />
                  <Button type="submit" view="normal" size="s" disabled={busy}>Create</Button>
                </form>}
                {fileError && <div className={styles.fileError} role="alert"><Text color="danger" variant="caption-2">{fileError}</Text></div>}
                <ul className={styles.files} aria-label="Workspace files">
                  {workspace.files.map((file) => (
                    <li key={file.name}>
                      <Button view="flat" size="s" width="max" className={styles.file} selected={workspace.entry === file.name}
                        aria-label={file.name} onClick={() => pickFile(file.name)} disabled={busy}>
                        <span aria-hidden="true"><FileBadge name={file.name} /></span>
                        <Text ellipsis>{file.name}</Text>
                      </Button>
                    </li>
                  ))}
                </ul>
                {!workspace.files.length && !creatingFile && <Text as="p" className={styles.sidebarNote} color="secondary" variant="caption-2">Add a .js, .ts, or .py file.</Text>}
              </>
            ) : (
              <form className={styles.repoForm} onSubmit={run}>
                <label><Text variant="caption-2" color="secondary">Public repository</Text>
                  <TextInput type="url" size="m" controlProps={{ required: true }} placeholder="https://github.com/owner/repo"
                    value={repo} disabled={busy || !!preview} onUpdate={setRepo} />
                </label>
                <label><Text variant="caption-2" color="secondary">App folder</Text>
                  <TextInput size="m" placeholder="Optional, e.g. apps/editor" value={directory}
                    disabled={busy || !!preview} onUpdate={setDirectory} />
                </label>
                <Button view="outlined" size="s" disabled={busy || !!preview} onClick={() => { setRepo(GRAVITY_EXAMPLE); setDirectory(''); }}>
                  Use Gravity UI example
                </Button>
                <Text as="p" variant="caption-2" color="secondary">Vite app with an npm or pnpm lockfile. Preview links are public until they expire. Do not use secrets.</Text>
              </form>
            )}
          </aside>}

          <TabProvider value={mode === 'files' ? workspace.entry : 'preview'} onUpdate={(name) => { if (mode === 'files') pickFile(name); }}>
            <section className={styles.editArea} aria-label={mode === 'files' ? 'Editor' : 'App preview'} data-console={showConsole}>
              <TabList className={styles.tabs} aria-label="Open files" contentOverflow="scroll" size="m">
                {mode === 'files' && workspace.files.map((file) => (
                  <Tab key={file.name} value={file.name} disabled={busy} aria-label={file.name}
                    icon={<span aria-hidden="true"><FileBadge name={file.name} /></span>}>{file.name}</Tab>
                ))}
                {mode === 'github' && <Tab value="preview" icon={<Icon data={Code} size={14} />}>App preview</Tab>}
              </TabList>
              <div className={styles.canvas}>
                {mode === 'files' && (activeFile ? (
                  <TabPanel value={activeFile.name} className={styles.editorPane}>
                    <CodeEditor name={activeFile.name} value={activeFile.content} disabled={busy} onChange={updateFile} onRun={() => void run()} />
                  </TabPanel>
                ) : (
                  <div className={styles.blank}>
                    <PlaceholderContainer size="s" align="center" image={<Icon data={Code} size={24} />}
                      title="No open file" description="Select a file or create a new one in the Explorer."
                      actions={[{ text: 'New file', onClick: () => { setShowExplorer(true); setCreatingFile(true); } }]} />
                  </div>
                ))}
                {mode === 'github' && (
                  <TabPanel value="preview" className={styles.editorPane}>
                    {preview ? (
                      <iframe className={styles.preview} sandbox="allow-scripts allow-same-origin" title="Sandbox preview"
                        src={preview.previewUrl} referrerPolicy="no-referrer" />
                    ) : (
                      <div className={styles.blank}>
                        <PlaceholderContainer size="s" align="center" image={<Icon data={Code} size={24} />}
                          title="No running app" description="Import a Vite project from the Explorer to preview it here." />
                      </div>
                    )}
                  </TabPanel>
                )}
              </div>
              {showConsole && <section className={styles.console} aria-label="Console" aria-busy={busy}>
                <div className={styles.consoleHead}>
                  <Text as="h2" variant="caption-2">Console</Text>
                  <div>
                    {preview && <Button href={preview.previewUrl} target="_blank" rel="noopener noreferrer" view="flat" size="s">
                      Open <Icon data={ArrowUpRightFromSquare} size={12} />
                    </Button>}
                    {output && <Button view="flat" size="s" onClick={() => setResult(null)}>Clear</Button>}
                  </div>
                </div>
                <div className={styles.consoleBody} aria-live="polite">
                  {error && <Alert theme="danger" message={error} />}
                  {logs && <pre>{logs}</pre>}
                  {busy && !preview && <span role="status" className={styles.running}><Spin size="xs" /> {mode === 'github' ? 'Importing, installing, and starting Vite…' : 'Starting cloud sandbox…'}</span>}
                  {!result && !error && !busy && <Text as="p" color="secondary" variant="body-1">Run the active file to see its output here.</Text>}
                  {output && <>
                    <Label size="xs" theme={output.exitCode === 0 ? 'success' : 'danger'}>{output.entry} · Exit code: {output.exitCode}</Label>
                    <pre>{output.output || 'No output.'}</pre>
                  </>}
                  {preview && <Label size="xs" theme="success">Preview running · expires in {previewExpired}</Label>}
                </div>
              </section>}
            </section>
          </TabProvider>
        </div>

        <footer className={styles.statusbar} aria-label="Workspace status">
          <div>
            <Label theme="utility" size="xxs">{mode === 'files' ? 'Local draft' : 'Vercel Sandbox'}</Label>
            {tooLarge && mode === 'files' && <span role="alert"><Text color="danger">Workspace exceeds 64 KiB</Text></span>}
            {mode === 'files' && activeFile && <Button view="flat" size="xs" aria-label="Delete active file"
              disabled={busy} onClick={() => setPendingDelete(activeFile.name)}><Icon data={TrashBin} size={13} /></Button>}
          </div>
          <div>{mode === 'files' && <><Text variant="caption-2">{activeFile ? language : 'No file'}</Text><Text variant="caption-2">UTF-8</Text><Text variant="caption-2">Ctrl/⌘ Enter to run</Text></>}</div>
        </footer>
        <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} size="s" initialFocus="cancel">
          <Dialog.Header caption="Delete file?" />
          <Dialog.Body>Remove {pendingDelete} from this workspace? This cannot be undone.</Dialog.Body>
          <Dialog.Footer preset="danger" textButtonApply="Delete" textButtonCancel="Cancel"
            onClickButtonApply={confirmDelete} onClickButtonCancel={() => setPendingDelete(null)} />
        </Dialog>
      </main>
    </ThemeProvider>
  );
}

function FileBadge({ name }: { name: string }) {
  const extension = name.slice(-2);
  return <Label size="xxs" theme={extension === 'js' ? 'warning' : extension === 'ts' ? 'info' : 'success'}>
    {extension.toUpperCase()}
  </Label>;
}
