'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import CodeEditor from './CodeEditor';
import GravitySetupForm from './GravitySetupForm';
import WorkspaceTree, { FileBadge } from './WorkspaceTree';
import { useWorkspaceDrag } from './useWorkspaceDrag';
import {
  ActionTooltip, Alert, Button, Dialog, Icon, Label, PlaceholderContainer, Popover, Progress,
  SegmentedRadioGroup, Select, Spin, Tab, TabList, TabPanel, TabProvider, Text, TextInput,
} from '@gravity-ui/uikit';
import { ArrowRight, ArrowUpRightFromSquare, Code, FilePlus, FolderPlus, FolderOpen, Pencil, PlayFill, Square, Terminal, TrashBin } from '@gravity-ui/icons';
import { useI18n } from '@/app/contexts/I18nContext';
import { PageActionBar } from '@/shared/ui/PageActionBar';
import { translatePlayground, translateRunError, type MessageKey } from './messages';
import { authFetch } from '@/lib/auth-fetch';
import { isSandboxPreviewUrl, MAX_CODE_BYTES, parseRunInput, PREVIEW_MS, WORKSPACE_MS, type PlaygroundBudget } from '@/lib/playground/input';
import {
  createWorkspaceNode, includesPath, joinPath, leafName, MAX_FILES, MAX_FOLDERS, MAX_NAME_BYTES, parentPath, parseWorkspaceDraft,
  relocateWorkspaceNode, removeWorkspaceNode, runnableKind, type Workspace, type WorkspaceNode,
} from '@/lib/playground/workspace';
import {
  applyTerminalChanges, GRAVITY_DEFAULTS, isGravityFolder, parseTerminalCommand, resolveTerminalDirectory,
  terminalCanCreate, type GravitySetup, type TerminalCommand,
  TERMINAL_MANIFESTS, TERMINAL_RESERVE_MS,
} from '@/lib/playground/terminal';
import styles from './playground.module.css';

const DRAFT = 'gareev-playground-files-v2';
const LEGACY_DRAFT = 'gareev-playground-draft-v1';
const ACTIVE = 'gareev-playground-run-v1';
const DRAFT_TTL = 60 * 60 * 1000;
const GRAVITY_EXAMPLE = 'https://github.com/gravity-ui/gravity-ui-vite-example';
const STARTER = "const ideas = ['design', 'build', 'try'];\nconsole.log(ideas.map((idea) => idea.toUpperCase()));";
type Preview = { kind: 'preview'; source?: 'html'; previewUrl: string; expiresAt: string; runId: string };
type ScriptOutput = { output: string; installLogs?: string; exitCode: number; entry: string };
type TerminalError = { key: MessageKey; params?: Record<string, string | number> } | { runError: string };
type TerminalEntry = { command?: string; logs?: string; error?: TerminalError; script?: ScriptOutput };
const MAX_TERMINAL_ENTRIES = 30;
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
  const budgetTitleId = useId();
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
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalCommand, setTerminalCommand] = useState('');
  const [terminalCwd, setTerminalCwd] = useState('');
  const [gravitySetup, setGravitySetup] = useState<GravitySetup | null>(null);
  const [gravityError, setGravityError] = useState<MessageKey | null>(null);
  const [transcript, setTranscript] = useState<(TerminalEntry & { id: number })[]>([]);
  const [runningCommand, setRunningCommand] = useState('');
  const terminalBody = useRef<HTMLDivElement>(null);
  const terminalInput = useRef<HTMLInputElement>(null);
  const nextTerminalId = useRef(0);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceNode | null>(null);
  const [repo, setRepo] = useState('');
  const [directory, setDirectory] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewError, setPreviewError] = useState<MessageKey | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [budget, setBudget] = useState<PlaygroundBudget | null>(null);
  const [budgetStatus, setBudgetStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [budgetRefresh, refreshBudget] = useState(0);
  const htmlPreview = preview?.source === 'html' ? preview : null;
  const activeFile = workspace.files.find((file) => file.name === workspace.entry);
  const canRun = activeFile && runnableKind(activeFile.name);
  const npmRun = canRun === 'node' && workspace.files.some(({ name }) =>
    leafName(name) === 'package-lock.json' && (!parentPath(name) || includesPath(parentPath(name), workspace.entry)));
  const target: WorkspaceNode | null = selectedFolder !== null
    ? selectedFolder ? { path: selectedFolder, kind: 'folder' } : null
    : activeFile ? { path: activeFile.name, kind: 'file' } : null;
  const currentFolder = selectedFolder ?? parentPath(activeFile?.name ?? '');
  const filePaths = useMemo(() => workspace.files.map(({ name }) => name), [workspace.files]);
  const encoder = new TextEncoder();
  const bytes = workspace.files.reduce((total, file) => total + encoder.encode(file.content).length, 0);
  const tooLarge = bytes > MAX_CODE_BYTES;
  const budgetBlocked = budget !== null && (
    !budget.enabled ||
    budget.remainingSeconds < (mode === 'github' || canRun === 'html' ? PREVIEW_MS : WORKSPACE_MS) / 1_000 ||
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
    if (active?.kind === 'preview' && isSandboxPreviewUrl(active.previewUrl) && Date.parse(active.expiresAt) > Date.now()) {
      setPreview(active);
      setMode(active.source === 'html' ? 'files' : 'github');
      if (active.source === 'html') setShowTerminal(false);
    } else cache(ACTIVE, null);
  }, []);

  useEffect(() => {
    if (!preview) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((Date.parse(preview.expiresAt) - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        setPreview(null);
        cache(ACTIVE, null);
        setPreviewError('previewExpired');
        setShowTerminal(true);
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

  useEffect(() => {
    const body = terminalBody.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [showTerminal, transcript, runningCommand, previewError]);

  function appendTerminal(entry: TerminalEntry) {
    const id = nextTerminalId.current++;
    setTranscript((history) => [...history.slice(-(MAX_TERMINAL_ENTRIES - 1)), { id, ...entry }]);
  }

  function clearTerminal() {
    setTranscript([]);
    setPreviewError(null);
  }

  function updateWorkspace(next: Workspace) {
    if (terminalCwd && !next.folders.includes(terminalCwd)) setTerminalCwd('');
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

  function moveWorkspaceNode(node: WorkspaceNode, parent: string) {
    const result = relocateWorkspaceNode(workspace, node, parent, leafName(node.path));
    if ('error' in result) return result.error;
    updateWorkspace(result.workspace);
    setSelectedFolder(node.kind === 'folder' ? result.path : null);
    if (node.kind === 'folder') {
      setCollapsed((previous) => previous.filter((folder) => !includesPath(node.path, folder)));
    }
    reveal(result.path);
    cancelNameAction();
  }

  function applyMove() {
    if (!moveNode || busy) return;
    const problem = moveWorkspaceNode(moveNode, destination);
    if (problem) return setMoveError(problem);
    setMoveNode(null);
  }

  const explorerDrag = useWorkspaceDrag({
    disabled: busy || !showExplorer || mode !== 'files',
    collapsed,
    canMove: (node, parent) => !('error' in relocateWorkspaceNode(workspace, node, parent, leafName(node.path))),
    onMove: moveWorkspaceNode,
    onExpand: setFolderOpen,
  });

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
    if (busy || preview || gravitySetup || budgetBlocked || (mode === 'files' && (!canRun || tooLarge))) return;
    setBusy(true);
    setShowTerminal(canRun !== 'html' || mode === 'github');
    setPreviewError(null);
    let logs = '';
    try {
      const response = await authFetch('/api/playground', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'github' ? { mode, repo, directory } : { mode, entry: workspace.entry, files: workspace.files,
          ...(workspace.folders.length ? { folders: workspace.folders } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) {
        logs = typeof data.logs === 'string' ? data.logs : '';
        throw new Error(data.error ?? 'Run failed.');
      }
      if (data.kind === 'preview') {
        if (!isSandboxPreviewUrl(data.previewUrl)) throw new Error('Preview is unavailable.');
        cache(ACTIVE, data);
        setPreview(data);
      } else {
        appendTerminal({ script: { ...data, entry: workspace.entry } });
      }
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : '';
      appendTerminal({ logs, error: { runError: message } });
      setShowTerminal(true);
    } finally {
      setBusy(false);
      refreshBudget((version) => version + 1);
    }
  }

  async function runTerminal(event: FormEvent) {
    event.preventDefault();
    const line = terminalCommand.trim();
    if (!line || busy || preview) return;
    const cwd = terminalCwd;
    const command = parseTerminalCommand(line);
    const prompt = `/${cwd} $ ${line}`;
    const commandError = (key: MessageKey, params?: Record<string, string | number>) =>
      appendTerminal({ command: prompt, error: { key, params } });
    if (line === 'clear') {
      clearTerminal();
      setTerminalCommand('');
      return;
    }
    if (line === 'cd' || line.startsWith('cd ')) {
      const directory = resolveTerminalDirectory(cwd, line.slice(2).trim(), workspace.folders);
      if (directory === null) return commandError('terminalFolderMissing');
      appendTerminal({ command: prompt });
      setTerminalCwd(directory);
      setTerminalCommand('');
      return;
    }
    if (!command) return commandError('terminalUnsupported');
    if (command.kind === 'create') {
      setGravityError(null);
      setGravitySetup({ ...GRAVITY_DEFAULTS, folder: command.folder });
      return;
    }
    if (terminalBudgetBlocked) return commandError('terminalBudget');
    await executeTerminal(line, command);
  }

  const terminalBudgetBlocked = budget && (!budget.enabled || budget.active ||
    budget.remainingSeconds < TERMINAL_RESERVE_MS / 1_000);

  async function submitGravitySetup(event: FormEvent) {
    event.preventDefault();
    if (!gravitySetup || busy || preview) return;
    const folder = gravitySetup.folder.trim();
    if (!isGravityFolder(folder)) return setGravityError('gravityInvalidFolder');
    if (!terminalCanCreate(workspace, terminalCwd, folder)) return setGravityError('gravityFolderExists');
    if (terminalBudgetBlocked) return setGravityError('terminalBudget');
    const options = {
      ...gravitySetup, folder, styles: gravitySetup.frontend && gravitySetup.styles, react: gravitySetup.frontend && gravitySetup.react,
    };
    setGravitySetup(null);
    setGravityError(null);
    await executeTerminal(terminalCommand.trim(), { kind: 'create', folder }, options);
  }

  async function executeTerminal(line: string, command: TerminalCommand, setup?: GravitySetup) {
    const cwd = terminalCwd;
    const prompt = `/${cwd} $ ${line}`;

    setRunningCommand(prompt);
    setTerminalCommand('');
    setBusy(true);
    let logs = '';
    try {
      const manifests = command.kind === 'install' ? TERMINAL_MANIFESTS.flatMap((name) => {
        const file = workspace.files.find((item) => item.name === joinPath(cwd, name));
        return file ? [{ name, content: file.content }] : [];
      }) : [];
      const res = await authFetch('/api/playground', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'npm', command: line, manifests, ...(setup ? { setup } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        logs = typeof data.logs === 'string' ? data.logs : '';
        throw new Error(data.error ?? '');
      }
      if (data.kind !== 'terminal' || typeof data.exitCode !== 'number') throw new Error();
      logs = typeof data.output === 'string' ? data.output : '';
      if (data.exitCode !== 0) {
        return appendTerminal({ command: prompt, logs, error: { key: 'terminalExit', params: { code: data.exitCode } } });
      }
      const next = applyTerminalChanges(workspace, cwd, command, data.changes);
      if (!next) return appendTerminal({ command: prompt, logs, error: { key: 'terminalExportFailed' } });
      updateWorkspace(next);
      if (command.kind === 'create') {
        setTerminalCwd(joinPath(cwd, command.folder));
        setSelectedFolder(null);
        setShowExplorer(true);
        reveal(next.entry);
      }
      appendTerminal({ command: prompt, logs });
    } catch (issue) {
      appendTerminal({ command: prompt, logs, error: { runError: issue instanceof Error ? issue.message : '' } });
    } finally {
      setBusy(false);
      setRunningCommand('');
      refreshBudget((version) => version + 1);
    }
  }

  async function stop() {
    if (!preview || busy) return;
    setBusy(true);
    setPreviewError(null);
    try {
      const response = await authFetch(`/api/playground?runId=${encodeURIComponent(preview.runId)}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 404) throw new Error();
      setPreview(null);
      cache(ACTIVE, null);
    } catch {
      setPreviewError('stopFailed');
      setShowTerminal(true);
    } finally {
      setBusy(false);
      refreshBudget((version) => version + 1);
    }
  }

  const runDisabled = busy || !!gravitySetup || budgetBlocked || (mode === 'files' ? tooLarge || !canRun : !repo.trim());
  const runLabel = mode === 'github' ? msg('importAndRun') : canRun ? msg('runFile', { name: activeFile.name }) : msg(activeFile ? 'notRunnable' : 'runUnselected');
  const runtime = budget ? msg('runtime', {
    hours: Math.floor(budget.remainingSeconds / 3600),
    minutes: String(Math.floor(budget.remainingSeconds % 3600 / 60)).padStart(2, '0'),
    seconds: String(budget.remainingSeconds % 60).padStart(2, '0'),
  }) : msg('sharedRuntimeShort');
  const runtimePercent = budget && budget.totalSeconds > 0
    ? Math.min(100, Math.max(0, 100 * budget.remainingSeconds / budget.totalSeconds)) : 0;
  const budgetTone = !budget || budget.remainingSeconds >= 2 * 3600 ? 'success'
    : budget.remainingSeconds >= 3600 ? 'warning' : 'danger';
  const previewExpired = preview ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}` : null;
  const language = !activeFile ? msg('noFile') : !canRun ? msg('plainText') : canRun === 'python' ? 'Python' : canRun === 'html' ? 'HTML'
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
          <SegmentedRadioGroup size="m" value={mode} disabled={busy || !!preview || !!gravitySetup}
            onUpdate={setMode} aria-label={msg('source')}
            options={[{ value: 'files', content: msg('workspace') }, { value: 'github', content: 'GitHub / Vite' }]} />
          <Button view="flat" size="s" selected={showExplorer} aria-expanded={showExplorer}
            onClick={() => setShowExplorer(!showExplorer)}><Icon data={FolderOpen} size={14} /> {msg('explorer')}</Button>
          <Button view="flat" size="s" selected={showTerminal} aria-expanded={showTerminal}
            aria-controls="playground-terminal" onClick={() => setShowTerminal(!showTerminal)}>
            <Icon data={Terminal} size={14} /> {msg('terminal')}
          </Button>
          <Button href="/auth" component={Link} view="flat" size="s" onClick={() => {
            try { window.sessionStorage.setItem('returnUrl', '/projects/playground'); } catch { /* Optional. */ }
          }}>{msg('signIn')}</Button>
        </div>
        <div className={styles.toolbarActions}>
          <Popover trigger="click" placement="bottom-end" offset={8} content={
            <div className={styles.budgetPopover} role="group" aria-labelledby={budgetTitleId}>
              <Text as="h2" id={budgetTitleId} className={styles.budgetText} variant="subheader-2">{msg('sharedRuntime')}</Text>
              {budgetStatus !== 'ready' && (
                <Text as="p" className={styles.budgetText} color="secondary">
                  {msg(budgetStatus === 'loading' ? 'loadingBudget' : 'unavailableBudget')}
                </Text>
              )}
              {budget && <>
                <div className={styles.budgetMeter}>
                  <div role="progressbar" aria-labelledby={budgetTitleId} aria-valuenow={Math.round(runtimePercent)}
                    aria-valuetext={runtime} data-budget-tone={budgetTone} className={styles.budgetProgress}>
                    <Progress size="m" value={runtimePercent} theme={budgetTone} text={runtime} />
                  </div>
                  <Text as="p" className={styles.budgetText} variant="caption-2" color="secondary">
                    {msg('window', { hours: Math.round(budget.totalSeconds / 3600) })}
                  </Text>
                </div>
                {(budget.active || !budget.enabled) && (
                  <div className={styles.budgetStatuses}>
                    {budget.active && <Label theme="info" size="xs">{msg('sandboxBusy')}</Label>}
                    {!budget.enabled && <Label theme="warning" size="xs">{msg('cloudDisabled')}</Label>}
                  </div>
                )}
              </>}
            </div>
          }>
            <Button view="outlined" size="m" aria-label={msg('sharedRuntime')}>
              {msg('sharedRuntimeShort')}
            </Button>
          </Popover>
          {mode === 'files' && canRun === 'html' && !preview && (
            <Text variant="caption-1" color="secondary" className={styles.htmlNotice}>{msg('htmlPublicNotice')}</Text>
          )}
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
              <div className={styles.treeLocation} {...explorerDrag.root}>
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
                disabled={busy} label={msg('filesList')} dragRow={explorerDrag.row} onExpand={setFolderOpen} onPick={(node) => {
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
          <section className={styles.editArea} aria-label={msg(mode === 'files' ? 'editor' : 'preview')} data-terminal={showTerminal} data-terminal-setup={showTerminal && !!gravitySetup}>
            <TabList className={styles.tabs} aria-label={msg(mode === 'files' ? 'editorTabs' : 'previewTabs')} contentOverflow="scroll" size="m">
              {mode === 'files' && workspace.files.map((file) => (
                <Tab key={file.name} value={file.name} disabled={busy} aria-label={file.name} title={file.name}
                  icon={<span aria-hidden="true"><FileBadge name={file.name} /></span>}>{leafName(file.name)}</Tab>
              ))}
              {mode === 'github' && <Tab value="preview" icon={<Icon data={Code} size={14} />}>{msg('preview')}</Tab>}
            </TabList>
            <div className={styles.canvas} data-html-preview={!!htmlPreview}>
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
              {htmlPreview && (
                <section className={styles.htmlPreview} aria-label={msg('htmlPreview')}>
                  <div className={styles.htmlPreviewHeader}>
                    <Text as="h2" variant="caption-2">{msg('htmlPreview')}</Text>
                    <div className={styles.htmlPreviewActions}>
                      <Text variant="caption-1" color="secondary">{msg('sandboxExpires', { time: previewExpired ?? '' })}</Text>
                      <Button size="s" view="flat" href={htmlPreview.previewUrl} target="_blank" rel="noopener noreferrer">
                        {msg('openHtmlPreview')} <Icon data={ArrowUpRightFromSquare} size={12} />
                      </Button>
                    </div>
                  </div>
                  <iframe className={styles.preview} sandbox="allow-scripts allow-same-origin" title={msg('htmlPreview')}
                    src={htmlPreview.previewUrl} referrerPolicy="no-referrer" />
                </section>
              )}
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
            {showTerminal && (
              <section id="playground-terminal" className={styles.terminalPanel} aria-label={msg('terminal')} aria-busy={busy}>
                <div className={styles.terminalHead}>
                  <Text as="h2" variant="caption-2">{msg('terminal')}</Text>
                  <div>
                    {preview && !htmlPreview && <Button href={preview.previewUrl} target="_blank" rel="noopener noreferrer" view="flat" size="s">
                      {msg('open')} <Icon data={ArrowUpRightFromSquare} size={12} />
                    </Button>}
                    <Button view="flat" size="s" disabled={busy || (!transcript.length && !previewError)}
                      onClick={clearTerminal}>{msg('clear')}</Button>
                  </div>
                </div>
                {gravitySetup ? (
                  <GravitySetupForm setup={gravitySetup} error={gravityError ? msg(gravityError) : undefined} msg={msg}
                    onUpdate={(next) => { setGravitySetup(next); setGravityError(null); }}
                    onCancel={() => {
                      setGravitySetup(null);
                      setGravityError(null);
                      requestAnimationFrame(() => terminalInput.current?.focus());
                    }}
                    onSubmit={submitGravitySetup} />
                ) : <>
                  <div ref={terminalBody} className={styles.terminalBody} role="log" aria-label={msg('terminalHistory')}>
                    {!transcript.length && !preview && !busy && !previewError &&
                      <Text as="p" color="secondary" variant="body-1">{msg(mode === 'files' ? 'terminalHelp' : 'emptyRepoTerminal')}</Text>}
                    {transcript.map(({ id, command, logs, error, script }) => (
                      <div className={styles.terminalEntry} key={id}>
                        {command && <pre>{command}</pre>}
                        {logs && <pre>{logs}</pre>}
                        {script && <>
                          {typeof script.installLogs === 'string' && <>
                            <Text as="p" variant="caption-2">{msg('dependenciesInstalled')}</Text>
                            {script.installLogs && <pre>{script.installLogs}</pre>}
                            <Text as="p" variant="caption-2">{msg('scriptOutput')}</Text>
                        </>}
                        <Label size="xs" theme={script.exitCode === 0 ? 'success' : 'danger'}>{msg('exitCode', { name: script.entry, code: script.exitCode })}</Label>
                        <pre>{script.output || msg('noOutput')}</pre>
                      </>}
                      {error && <Alert theme="danger" message={'key' in error ? msg(error.key, error.params) : translateRunError(t, error.runError)} />}
                    </div>
                  ))}
                  {runningCommand && <pre>{runningCommand}</pre>}
                  {busy && !preview && <span role="status" className={styles.running}><Spin size="xs" /> {
                    msg(runningCommand ? 'terminalRunning' : mode === 'github' ? 'importing' : npmRun ? 'installingAndRunning' : 'starting')
                  }</span>}
                  {previewError && <Alert theme="danger" message={msg(previewError)} />}
                  {preview && <Label size="xs" theme="success">{msg('expires', { time: previewExpired ?? '' })}</Label>}
                </div>
                {mode === 'files' && <form className={styles.terminalForm} onSubmit={runTerminal}>
                  <code>/{terminalCwd} $</code>
                  <TextInput controlRef={terminalInput} value={terminalCommand} onUpdate={setTerminalCommand}
                    disabled={busy || !!preview} placeholder="npm create @gravity-ui" autoComplete="off"
                    controlProps={{ maxLength: 320, 'aria-label': msg('terminalCommand') }} />
                  <Button type="submit" view="action" disabled={busy || !!preview || !terminalCommand.trim()}>{msg('run')}</Button>
                </form>}
                </>}
              </section>
            )}
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
