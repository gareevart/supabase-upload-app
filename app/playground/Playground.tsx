'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import CodeEditor from './CodeEditor';
import WorkspaceTree, { FileBadge } from './WorkspaceTree';
import {
  ActionTooltip, Alert, Button, Dialog, Icon, Label, PlaceholderContainer, Popover, Progress,
  SegmentedRadioGroup, Select, Spin, Tab, TabList, TabPanel, TabProvider, Text, TextInput,
} from '@gravity-ui/uikit';
import { ArrowRight, ArrowUpRightFromSquare, Code, FilePlus, FolderPlus, FolderOpen, Pencil, PlayFill, Square, Terminal, TrashBin } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { PageActionBar } from '@/shared/ui/PageActionBar';
import { translatePlayground, translateRunError, type MessageKey } from './messages';
import { authFetch } from '@/lib/auth-fetch';
import { MAX_CODE_BYTES, parseRunInput, PREVIEW_MS, WORKSPACE_MS, type PlaygroundBudget } from '@/lib/playground/input';
import {
  createWorkspaceNode, includesPath, leafName, MAX_FILES, MAX_FOLDERS, MAX_NAME_BYTES, parentPath, parseWorkspaceDraft,
  relocateWorkspaceNode, removeWorkspaceNode, runnableKind, type Workspace, type WorkspaceNode,
} from '@/lib/playground/workspace';
import styles from './playground.module.css';

const DRAFT = 'gareev-playground-files-v2';
const LEGACY_DRAFT = 'gareev-playground-draft-v1';
const ACTIVE = 'gareev-playground-run-v1';
const DRAFT_TTL = 60 * 60 * 1000;
const GRAVITY_EXAMPLE = 'https://github.com/gravity-ui/gravity-ui-vite-example';
const STARTER = "const ideas = ['design', 'build', 'try'];\nconsole.log(ideas.map((idea) => idea.toUpperCase()));";
type Preview = { kind: 'preview'; previewUrl: string; expiresAt: string; runId: string };
type Result = Preview | { kind: 'output'; output: string; exitCode: number; entry: string };
type NameAction = { kind: 'file' | 'folder'; parent: string } | { kind: 'rename'; node: WorkspaceNode };
const DEFAULT_WORKSPACE: Workspace = { files: [{ name: 'main.js', content: STARTER }], entry: 'main.js', folders: [] };

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
  const { t } = useI18n();
  const msg = (key: MessageKey, params?: Record<string, string | number>) => translatePlayground(t, key, params);
  const [mode, setMode] = useState<'files' | 'github'>('files');
  const [workspace, setWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [newFileName, setNewFileName] = useState('');
  const [fileError, setFileError] = useState<MessageKey | null>(null);
  const [nameAction, setNameAction] = useState<NameAction | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [moveNode, setMoveNode] = useState<WorkspaceNode | null>(null);
  const [destination, setDestination] = useState('');
  const [moveError, setMoveError] = useState<MessageKey | null>(null);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceNode | null>(null);
  const [repo, setRepo] = useState('');
  const [directory, setDirectory] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ key: MessageKey } | { runError: string } | null>(null);
  const [logs, setLogs] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [budget, setBudget] = useState<PlaygroundBudget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [budgetRefresh, refreshBudget] = useState(0);
  const preview = result?.kind === 'preview' ? result : null;
  const activeFile = workspace.files.find((file) => file.name === workspace.entry);
  const canRun = activeFile && runnableKind(activeFile.name);
  const target: WorkspaceNode | null = selectedFolder !== null
    ? selectedFolder ? { path: selectedFolder, kind: 'folder' } : null
    : activeFile ? { path: activeFile.name, kind: 'file' } : null;
  const currentFolder = selectedFolder ?? parentPath(activeFile?.name ?? '');
  const filePaths = useMemo(() => workspace.files.map(({ name }) => name), [workspace.files]);
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
      const restored = parseWorkspaceDraft(draft); // Drafts can be edited even above the run limit.
      if (restored) setWorkspace(restored);
    } else {
      cache(DRAFT, null);
      const legacy = cached<{ code: string; expires: number }>(LEGACY_DRAFT);
      const restored = legacy && legacy.expires > Date.now() ? parseRunInput({ mode: 'javascript', code: legacy.code }) : null;
      if (restored?.mode === 'files' && legacy) {
        const migrated = { files: restored.files, entry: restored.entry, folders: [] };
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
        setError({ key: 'previewExpired' });
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

  function setFolderOpen(path: string, open: boolean) {
    setCollapsed((previous) => open ? previous.filter((folder) => folder !== path)
      : previous.includes(path) ? previous : [...previous, path]);
  }

  function reveal(path: string) {
    setCollapsed((previous) => previous.filter((folder) => !includesPath(folder, path)));
  }

  function cancelNameAction() {
    setNameAction(null);
    setFileError(null);
  }

  function startNameAction(action: NameAction) {
    setNameAction(action);
    setNewFileName(action.kind === 'rename' ? leafName(action.node.path) : '');
    setFileError(null);
  }

  function submitName(event: FormEvent) {
    event.preventDefault();
    if (!nameAction || busy) return;
    const name = newFileName.trim();
    const result = nameAction.kind === 'rename'
      ? relocateWorkspaceNode(workspace, nameAction.node, parentPath(nameAction.node.path), name)
      : createWorkspaceNode(workspace, nameAction.parent, name, nameAction.kind);
    if ('error' in result) return setFileError(result.error);

    const kind = nameAction.kind === 'rename' ? nameAction.node.kind : nameAction.kind;
    updateWorkspace(result.workspace);
    setSelectedFolder(kind === 'folder' ? result.path : null);
    if (nameAction.kind === 'rename' && nameAction.node.kind === 'folder') {
      const oldPath = nameAction.node.path;
      setCollapsed((previous) => previous.filter((folder) => !includesPath(oldPath, folder)));
    }
    reveal(result.path);
    cancelNameAction();
  }

  function applyMove() {
    if (!moveNode || busy) return;
    const result = relocateWorkspaceNode(workspace, moveNode, destination, leafName(moveNode.path));
    if ('error' in result) return setMoveError(result.error);
    updateWorkspace(result.workspace);
    setSelectedFolder(moveNode.kind === 'folder' ? result.path : null);
    if (moveNode.kind === 'folder') {
      setCollapsed((previous) => previous.filter((folder) => !includesPath(moveNode.path, folder)));
    }
    reveal(result.path);
    setMoveNode(null);
  }

  function confirmDelete() {
    if (!pendingDelete || busy) return;
    updateWorkspace(removeWorkspaceNode(workspace, pendingDelete));
    if (pendingDelete.kind === 'folder') {
      setCollapsed((previous) => previous.filter((folder) => !includesPath(pendingDelete.path, folder)));
      setSelectedFolder(parentPath(pendingDelete.path));
    }
    setPendingDelete(null);
  }

  async function run(event?: FormEvent) {
    event?.preventDefault();
    if (busy || preview || budgetBlocked || (mode === 'files' && (!canRun || tooLarge))) return;
    setBusy(true);
    setShowConsole(true);
    setError(null);
    setLogs('');
    setResult(null);
    try {
      const response = await authFetch('/api/playground', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'github' ? { mode, repo, directory } : { mode, entry: workspace.entry, files: workspace.files,
          ...(workspace.folders.length ? { folders: workspace.folders } : {}) }),
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
      setError({ runError: message });
    } finally {
      setBusy(false);
      refreshBudget((version) => version + 1);
    }
  }

  async function stop() {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await authFetch(`/api/playground?runId=${encodeURIComponent(preview.runId)}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error();
      setResult(null);
      cache(ACTIVE, null);
    } catch {
      setError({ key: 'stopFailed' });
    } finally {
      setBusy(false);
      refreshBudget((version) => version + 1);
    }
  }

  const runDisabled = busy || budgetBlocked || (mode === 'files' ? tooLarge || !canRun : !repo.trim());
  const runLabel = mode === 'github' ? msg('importAndRun') : canRun ? msg('runFile', { name: activeFile.name }) : msg(activeFile ? 'notRunnable' : 'runUnselected');
  const runtime = budget ? msg('runtime', {
    hours: Math.floor(budget.remainingSeconds / 3600),
    minutes: String(Math.floor(budget.remainingSeconds % 3600 / 60)).padStart(2, '0'),
    seconds: String(budget.remainingSeconds % 60).padStart(2, '0'),
  }) : msg('sharedRuntimeShort');
  const previewExpired = preview ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : null;
  const output = result?.kind === 'output' ? result : null;
  const language = !activeFile ? msg('noFile') : !canRun ? msg('plainText') : canRun === 'python' ? 'Python'
    : /\.[cm]?ts$/i.test(activeFile.name) ? 'TypeScript' : 'JavaScript';

  function pickFile(name: string) {
    if (busy || !workspace.files.some((file) => file.name === name)) return;
    cancelNameAction();
    setSelectedFolder(null);
    reveal(name);
    updateWorkspace({ ...workspace, entry: name });
  }

  function updateFile(content: string) {
    if (!activeFile) return;
    updateWorkspace({ ...workspace, files: workspace.files.map((file) =>
      file.name === activeFile.name ? { ...file, content } : file) });
  }

  return (
    <div className={styles.shell}>
      <h1 className={styles.a11yHeading}>{msg('title')}</h1>
      <PageActionBar
        ariaLabel={msg('actions')}
        className={styles.pageBar}
        maxItems={2}
        items={[{ label: msg('projects'), href: '/projects' }, { label: msg('title') }]}
      />
      <div className={styles.activity}>
        <div className={styles.activityTools}>
          <SegmentedRadioGroup size="m" value={mode} disabled={busy || !!preview}
            onUpdate={(value) => setMode(value)} aria-label={msg('source')}
            options={[{ value: 'files', content: msg('workspace') }, { value: 'github', content: 'GitHub / Vite' }]} />
          <Button view="flat" size="s" selected={showExplorer} aria-expanded={showExplorer}
            onClick={() => setShowExplorer(!showExplorer)}><Icon data={FolderOpen} size={14} /> {msg('explorer')}</Button>
          <Button view="flat" size="s" selected={showConsole} aria-expanded={showConsole}
            onClick={() => setShowConsole(!showConsole)}><Icon data={Terminal} size={14} /> {msg('console')}</Button>
          <Button href="/auth" component={Link} view="flat" size="s" onClick={() => {
            try { window.sessionStorage.setItem('returnUrl', '/projects/playground'); } catch { /* Optional. */ }
          }}>{msg('signIn')}</Button>
        </div>
        <div className={styles.toolbarActions}>
          <Popover trigger="click" placement="bottom-end" content={
            <div className={styles.budgetPopover}>
              <Text as="h2" variant="subheader-2">{msg('sharedRuntime')}</Text>
              {budgetStatus === 'loading' && <Text as="p" color="secondary">{msg('loadingBudget')}</Text>}
              {budgetStatus === 'unavailable' && <Text as="p" color="secondary">{msg('unavailableBudget')}</Text>}
              {budget && <>
                <Progress size="s" value={100 * budget.remainingSeconds / budget.totalSeconds} />
                <Text as="p" variant="body-1">{msg('window', { hours: Math.round(budget.totalSeconds / 3600), starts: `${budget.remainingStarts}/${budget.dailyStarts}` })}</Text>
                <Text as="p" variant="caption-2" color="secondary">{msg('budgetNote')}</Text>
                {budget.active && <Label theme="info" size="xs">{msg('sandboxBusy')}</Label>}
                {!budget.enabled && <Label theme="warning" size="xs">{msg('cloudDisabled')}</Label>}
              </>}
            </div>
          }>
            <Button view="outlined" size="m" aria-label={msg('sharedRuntime')}>
              {runtime}
            </Button>
          </Popover>
          {preview ? (
            <Button view="outlined" size="m" loading={busy} onClick={() => void stop()}>
              <Icon data={Square} size={14} /> {msg('stopPreview')}
            </Button>
          ) : (
            <ActionTooltip title={runLabel} hotkey="mod+enter">
              <Button view="action" size="m" aria-label={runLabel} disabled={runDisabled} loading={busy} onClick={() => void run()}>
                <Icon data={PlayFill} size={14} /> {msg(mode === 'github' ? 'importAndRunShort' : 'run')}
              </Button>
            </ActionTooltip>
          )}
        </div>
      </div>

      <div className={styles.workbench} data-explorer={showExplorer}>
        {showExplorer && <aside className={styles.explorer} aria-label={msg('explorer')}>
          <div className={styles.sideHeading}>
            <Text as="h2" variant="caption-2">{msg(mode === 'files' ? 'explorer' : 'repo')}</Text>
            {mode === 'files' && <div className={styles.fileActions}>
              <TreeAction icon={FilePlus} label={msg('newFile')} disabled={busy}
                action={() => startNameAction({ kind: 'file', parent: currentFolder })} />
              <TreeAction icon={FolderPlus} label={msg('newFolder')} disabled={busy}
                action={() => startNameAction({ kind: 'folder', parent: currentFolder })} />
              {target && <>
                <TreeAction icon={Pencil} label={msg('renameNode')} disabled={busy}
                  action={() => startNameAction({ kind: 'rename', node: target })} />
                <TreeAction icon={ArrowRight} label={msg('moveNode')} disabled={busy}
                  action={() => { cancelNameAction(); setMoveError(null); setDestination(parentPath(target.path)); setMoveNode(target); }} />
                <TreeAction icon={TrashBin} label={msg('deleteNode')} disabled={busy}
                  action={() => { cancelNameAction(); setPendingDelete(target); }} />
              </>}
            </div>}
          </div>
          {mode === 'files' ? (
            <>
              <div className={styles.treeLocation}>
                <Button size="xs" view="flat" selected={selectedFolder === ''} disabled={busy}
                  onClick={() => { cancelNameAction(); setSelectedFolder(''); }}>{msg('projectRoot')}</Button>
                {currentFolder && <Text variant="caption-2" color="secondary" ellipsis title={currentFolder}>/{currentFolder}</Text>}
              </div>
              {nameAction && <form className={styles.createFile} onSubmit={submitName}>
                <TextInput key={nameAction.kind} autoFocus size="s"
                  controlProps={{ maxLength: MAX_NAME_BYTES, 'aria-label': msg(nameAction.kind === 'rename' ? 'newName' : nameAction.kind === 'folder' ? 'folderName' : 'filename') }}
                  placeholder={msg(nameAction.kind === 'rename' ? 'newName' : nameAction.kind === 'folder' ? 'folderName' : 'filename')}
                  value={newFileName} disabled={busy} onUpdate={(value) => { setNewFileName(value); setFileError(null); }}
                  onKeyDown={(event) => { if (event.key === 'Escape') cancelNameAction(); }} />
                <Button type="submit" view="normal" size="s" disabled={busy}>{msg(nameAction.kind === 'rename' ? 'saveName' : 'create')}</Button>
              </form>}
              {fileError && <div className={styles.fileError} role="alert"><Text color="danger" variant="caption-2">
                {msg(fileError, { count: fileError === 'tooManyFolders' ? MAX_FOLDERS : MAX_FILES })}</Text></div>}
              <WorkspaceTree paths={filePaths} folders={workspace.folders} selected={target?.path ?? ''} collapsed={collapsed}
                disabled={busy} label={msg('filesList')} onExpand={setFolderOpen} onPick={(node) => {
                  cancelNameAction();
                  if (node.kind === 'file') pickFile(node.path);
                  else {
                    setSelectedFolder(node.path);
                    setFolderOpen(node.path, selectedFolder !== node.path || collapsed.includes(node.path));
                  }
                }} />
              {!workspace.files.length && !workspace.folders.length && !nameAction &&
                <Text as="p" className={styles.sidebarNote} color="secondary" variant="caption-2">{msg('addFileHint')}</Text>}
            </>
          ) : (
            <form className={styles.repoForm} onSubmit={run}>
              <label><Text variant="caption-2" color="secondary">{msg('publicRepo')}</Text>
                <TextInput type="url" size="m" controlProps={{ required: true }} placeholder="https://github.com/owner/repo"
                  value={repo} disabled={busy || !!preview} onUpdate={setRepo} />
              </label>
              <label><Text variant="caption-2" color="secondary">{msg('appFolder')}</Text>
                <TextInput size="m" placeholder={msg('appFolderPlaceholder')} value={directory}
                  disabled={busy || !!preview} onUpdate={setDirectory} />
              </label>
              <Button view="outlined" size="s" disabled={busy || !!preview} onClick={() => { setRepo(GRAVITY_EXAMPLE); setDirectory(''); }}>
                {msg('gravityExample')}
              </Button>
              <Text as="p" variant="caption-2" color="secondary">{msg('repoHint')}</Text>
            </form>
          )}
        </aside>}

        <TabProvider value={mode === 'files' ? workspace.entry : 'preview'} onUpdate={(name) => { if (mode === 'files') pickFile(name); }}>
          <section className={styles.editArea} aria-label={msg(mode === 'files' ? 'editor' : 'preview')} data-console={showConsole}>
            <TabList className={styles.tabs} aria-label={msg(mode === 'files' ? 'editorTabs' : 'previewTabs')} contentOverflow="scroll" size="m">
              {mode === 'files' && workspace.files.map((file) => (
                <Tab key={file.name} value={file.name} disabled={busy} aria-label={file.name} title={file.name}
                  icon={<span aria-hidden="true"><FileBadge name={file.name} /></span>}>{leafName(file.name)}</Tab>
              ))}
              {mode === 'github' && <Tab value="preview" icon={<Icon data={Code} size={14} />}>{msg('preview')}</Tab>}
            </TabList>
            <div className={styles.canvas}>
              {mode === 'files' && (activeFile ? (
                <TabPanel value={activeFile.name} className={styles.editorPane}>
                  <CodeEditor name={activeFile.name} value={activeFile.content} disabled={busy} onChange={updateFile} onRun={() => void run()} />
                </TabPanel>
              ) : (
                <div className={styles.blank}>
                  <PlaceholderContainer size="s" align="center" image={<Icon data={Code} size={24} />}
                    title={msg('noFileOpen')} description={msg('noFileHint')}
                    actions={[{ text: msg('newFile'), onClick: () => { setShowExplorer(true); startNameAction({ kind: 'file', parent: currentFolder }); } }]} />
                </div>
              ))}
              {mode === 'github' && (
                <TabPanel value="preview" className={styles.editorPane}>
                  {preview ? (
                    <iframe className={styles.preview} sandbox="allow-scripts allow-same-origin" title={msg('sandboxPreview')}
                      src={preview.previewUrl} referrerPolicy="no-referrer" />
                  ) : (
                    <div className={styles.blank}>
                      <PlaceholderContainer size="s" align="center" image={<Icon data={Code} size={24} />}
                        title={msg('noApp')} description={msg('noAppHint')} />
                    </div>
                  )}
                </TabPanel>
              )}
            </div>
            {showConsole && <section className={styles.console} aria-label={msg('console')} aria-busy={busy}>
              <div className={styles.consoleHead}>
                <Text as="h2" variant="caption-2">{msg('console')}</Text>
                <div>
                  {preview && <Button href={preview.previewUrl} target="_blank" rel="noopener noreferrer" view="flat" size="s">
                    {msg('open')} <Icon data={ArrowUpRightFromSquare} size={12} />
                  </Button>}
                  {output && <Button view="flat" size="s" onClick={() => setResult(null)}>{msg('clear')}</Button>}
                </div>
              </div>
              <div className={styles.consoleBody} aria-live="polite">
                {error && <Alert theme="danger" message={'key' in error ? msg(error.key) : translateRunError(t, error.runError)} />}
                {logs && <pre>{logs}</pre>}
                {busy && !preview && <span role="status" className={styles.running}><Spin size="xs" /> {msg(mode === 'github' ? 'importing' : 'starting')}</span>}
                {!result && !error && !busy && <Text as="p" color="secondary" variant="body-1">{msg(mode === 'files' ? 'emptyConsole' : 'emptyRepoConsole')}</Text>}
                {output && <>
                  <Label size="xs" theme={output.exitCode === 0 ? 'success' : 'danger'}>{msg('exitCode', { name: output.entry, code: output.exitCode })}</Label>
                  <pre>{output.output || msg('noOutput')}</pre>
                </>}
                {preview && <Label size="xs" theme="success">{msg('expires', { time: previewExpired ?? '' })}</Label>}
              </div>
            </section>}
          </section>
        </TabProvider>
      </div>

      <footer className={styles.statusbar} aria-label={msg('workspaceStatus')}>
        <div>
          <Label theme="utility" size="xxs">{mode === 'files' ? msg('draft') : 'Vercel Sandbox'}</Label>
          {tooLarge && mode === 'files' && <span role="alert"><Text color="danger">{msg('sizeLimit')}</Text></span>}
          {mode === 'files' && activeFile && <Button view="flat" size="xs" aria-label={msg('deleteActive')}
            disabled={busy} onClick={() => setPendingDelete({ path: activeFile.name, kind: 'file' })}><Icon data={TrashBin} size={13} /></Button>}
        </div>
        <div>{mode === 'files' && <><Text variant="caption-2">{language}</Text><Text variant="caption-2">UTF-8</Text><Text variant="caption-2">{canRun ? msg('runShortcut') : ''}</Text></>}</div>
      </footer>
      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)} size="s" initialFocus="cancel">
        <Dialog.Header caption={msg(pendingDelete?.kind === 'folder' ? 'deleteFolderQuestion' : 'deleteQuestion')} />
        <Dialog.Body>{msg(pendingDelete?.kind === 'folder' ? 'deleteFolderPrompt' : 'deletePrompt', { name: pendingDelete?.path ?? '' })}</Dialog.Body>
        <Dialog.Footer preset="danger" textButtonApply={msg('delete')} textButtonCancel={msg('cancel')}
          onClickButtonApply={confirmDelete} onClickButtonCancel={() => setPendingDelete(null)} />
      </Dialog>
      <Dialog open={!!moveNode} onClose={() => setMoveNode(null)} size="s">
        <Dialog.Header caption={msg('moveNode')} />
        <Dialog.Body>
          <div className={styles.moveForm}>
            <Text>{moveNode?.path}</Text>
            <Select width="max" label={msg('destination')} aria-label={msg('destination')}
              value={[destination || '/']} onUpdate={([value]) => { setDestination(value === '/' ? '' : value); setMoveError(null); }}
              options={[{ value: '/', content: msg('projectRoot') },
                ...workspace.folders.filter((folder) => moveNode?.kind !== 'folder' || !includesPath(moveNode.path, folder))
                  .map((folder) => ({ value: folder, content: '/' + folder }))]} />
            {moveError && <Text color="danger" role="alert">{msg(moveError)}</Text>}
          </div>
        </Dialog.Body>
        <Dialog.Footer textButtonApply={msg('move')} textButtonCancel={msg('cancel')}
          onClickButtonApply={applyMove} onClickButtonCancel={() => setMoveNode(null)} />
      </Dialog>
    </div>
  );
}

function TreeAction({ icon, label, disabled, action }: {
  icon: React.ComponentProps<typeof Icon>['data'];
  label: string;
  disabled: boolean;
  action: () => void;
}) {
  return <ActionTooltip title={label}>
    <Button view="flat" size="s" aria-label={label} disabled={disabled} onClick={action}>
      <Icon data={icon} size={14} />
    </Button>
  </ActionTooltip>;
}
