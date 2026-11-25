import '@testing-library/jest-dom';
import { I18nProvider, useI18n } from '@/app/contexts/I18nContext';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@gravity-ui/uikit';
import { TextEncoder } from 'node:util';
import Playground from '../Playground';
import { authFetch } from '@/lib/auth-fetch';

jest.mock('@gravity-ui/navigation', () => {
  const ActionBar = ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>;
  const Slot = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return { ActionBar: Object.assign(ActionBar, { Section: Slot, Group: Slot, Item: Slot }) };
});
jest.mock('@/features/favorites/ui/FavoriteToggleButton', () => ({ FavoriteToggleButton: () => null }));
jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('../CodeEditor', () => ({
  __esModule: true,
  default: ({ name, value, onChange }: { name: string; value: string; onChange: (value: string) => void }) =>
    <textarea aria-label={name} value={value} onChange={(event) => onChange(event.target.value)} />,
}));

beforeEach(() => {
  Object.assign(globalThis, { TextEncoder });
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    media: query, matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
  }) });
  sessionStorage.clear();
  localStorage.clear();
  jest.clearAllMocks();
  Object.assign(globalThis, { fetch: jest.fn(() => new Promise(() => {})) });
});

function Providers({ children }: React.PropsWithChildren) {
  return <ThemeProvider theme="light" scoped><I18nProvider>{children}</I18nProvider></ThemeProvider>;
}
const demoBudget = {
  enabled: true, remainingSeconds: 17800, totalSeconds: 18000, remainingStarts: 8, dailyStarts: 10, active: false,
  dailyResetAt: '2026-11-26T00:00:00Z',
};
const mockBudget = (data: object) => ({
  ok: true, json: async () => data,
});

const addFile = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'New file' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'New filename' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
};

it.each([
  ['script.js', 'console.log(4)'],
  ['script.ts', 'const value: number = 4; console.log(value)'],
  ['script.py', 'print(4)'],
])('creates and runs the selected %s file, then restores the draft after reload', async (name, content) => {
  (authFetch as jest.Mock).mockResolvedValue({
    ok: true, json: async () => ({ kind: 'output', output: '4', exitCode: 0 }),
  });
  const view = render(<Playground />, { wrapper: Providers });
  addFile(name);
  const editor = screen.getByRole('textbox', { name });
  fireEvent.change(editor, { target: { value: content } });
  fireEvent.click(screen.getByRole('button', { name: 'Run ' + name }));
  expect(await screen.findByText(name + ' · Exit code: 0')).toBeInTheDocument();
  expect(screen.getByText('4')).toBeInTheDocument();
  expect(authFetch).toHaveBeenCalledTimes(1);
  const [, request] = (authFetch as jest.Mock).mock.calls[0];
  expect(JSON.parse(request.body)).toEqual({
    mode: 'files', entry: name,
    files: [{ name: 'main.js', content: expect.any(String) }, { name, content }],
  });
  view.unmount();
  render(<Playground />, { wrapper: Providers });
  expect(screen.getByRole('textbox', { name })).toHaveValue(content);
});

it('opens files from the Explorer by mouse and keyboard and stays in sync with the editor tabs', () => {
  render(<Playground />, { wrapper: Providers });
  addFile('helper.ts');
  fireEvent.change(screen.getByRole('textbox', { name: 'helper.ts' }), { target: { value: 'export const value = 42;' } });

  const list = screen.getByRole('tree', { name: 'Workspace files' });
  const main = within(list).getByRole('treeitem', { name: 'main.js', selected: false });
  const helper = within(list).getByRole('treeitem', { name: 'helper.ts', selected: true });
  fireEvent.click(main);

  expect(main).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'main.js', selected: true })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run main.js' })).toBeInTheDocument();

  act(() => list.focus());
  expect(list).toHaveFocus();
  fireEvent.keyDown(list, { key: 'ArrowDown' });
  expect(list).toHaveAttribute('aria-activedescendant', helper.id);
  expect(main).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(list, { key: 'Enter' });

  expect(helper).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('textbox', { name: 'helper.ts' })).toHaveValue('export const value = 42;');
  expect(screen.getByRole('button', { name: 'Run helper.ts' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'main.js' }));
  expect(main).toHaveAttribute('aria-selected', 'true');
});

it('does not switch files while a run is in progress', () => {
  (authFetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
  render(<Playground />, { wrapper: Providers });
  addFile('helper.ts');
  const list = screen.getByRole('tree', { name: 'Workspace files' });
  act(() => list.focus());
  fireEvent.click(screen.getByRole('button', { name: 'Run helper.ts' }));

  const main = within(list).getByRole('treeitem', { name: 'main.js' });
  expect(main).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(main);
  fireEvent.keyDown(list, { key: 'ArrowUp' });
  fireEvent.keyDown(list, { key: 'Enter' });
  expect(screen.getByRole('textbox', { name: 'helper.ts' })).toBeInTheDocument();
});

const addFolder = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Folder name' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Create' }));
};

it('creates and edits arbitrary text files in nested folders, then restores the tree and document', () => {
  const view = render(<Playground />, { wrapper: Providers });
  addFolder('src');
  addFolder('assets');
  addFile('README');
  const tree = screen.getByRole('tree', { name: 'Workspace files' });
  expect(within(tree).getByRole('treeitem', { name: 'README' })).toHaveAttribute('aria-level', '3');
  const editor = screen.getByRole('textbox', { name: 'src/assets/README' });
  fireEvent.change(editor, { target: { value: 'A text file with no extension.' } });
  expect(screen.getByRole('button', { name: 'Open a JavaScript, TypeScript, or Python file to run, or HTML to preview' })).toBeDisabled();

  view.unmount();
  render(<Playground />, { wrapper: Providers });
  expect(screen.getByRole('treeitem', { name: 'assets' })).toHaveAttribute('aria-level', '2');
  expect(screen.getByRole('textbox', { name: 'src/assets/README' })).toHaveValue('A text file with no extension.');
});

it('handles extensionless names that match JavaScript object properties', () => {
  render(<Playground />, { wrapper: Providers });
  addFolder('__proto__');
  addFile('constructor');
  expect(screen.getByRole('treeitem', { name: '__proto__' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '__proto__/constructor' })).toBeInTheDocument();
});

it('renames folders and confirms recursive deletion while preserving other files', async () => {
  render(<Playground />, { wrapper: Providers });
  addFolder('src');
  addFile('.gitignore');
  fireEvent.change(screen.getByRole('textbox', { name: 'src/.gitignore' }), { target: { value: 'node_modules/' } });
  fireEvent.click(screen.getByRole('treeitem', { name: 'src' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rename selected item' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'New name' }), { target: { value: 'source' } });
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
  expect(screen.getByRole('textbox', { name: 'source/.gitignore' })).toHaveValue('node_modules/');

  fireEvent.click(screen.getByRole('button', { name: 'Delete selected item' }));
  expect(await screen.findByText('Delete source and everything inside it? This cannot be undone.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('textbox', { name: 'main.js' })).toBeInTheDocument();
  expect(screen.queryByRole('treeitem', { name: 'source' })).not.toBeInTheDocument();
  expect(screen.queryByRole('treeitem', { name: '.gitignore' })).not.toBeInTheDocument();
});

it('keeps unsent files when switching to the independent GitHub import mode', () => {
  render(<Playground />, { wrapper: Providers });
  addFile('custom.py');
  fireEvent.change(screen.getByRole('textbox', { name: 'custom.py' }), { target: { value: 'print(1)' } });
  fireEvent.click(screen.getByRole('radio', { name: 'GitHub / Vite' }));
  expect(screen.getByRole('button', { name: 'Import and run' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Workspace' }));
  expect(screen.getByRole('textbox', { name: 'custom.py' })).toHaveValue('print(1)');
});

it('displays the shared quota and disables Run when it runs out', async () => {
  (fetch as jest.Mock).mockResolvedValue(mockBudget({ ...demoBudget, remainingSeconds: 0 }));
  render(<Playground />, { wrapper: Providers });
  expect(await screen.findByText('0h 00m 00s')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Shared Playground runtime' }));
  expect(await screen.findByText(/8\/10 starts left today/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Run main.js' })).toBeDisabled();
});

it('uses the post action bar and translates the workspace, dialogs and existing errors with the current site language', async () => {
  localStorage.setItem('app-language', 'ru');
  (authFetch as jest.Mock).mockResolvedValue({
    ok: false, json: async () => ({ error: 'Dependency install failed (exit 1).', logs: 'npm error' }),
  });
  function LanguageSwitch() {
    const { setLanguage } = useI18n();
    return <button onClick={() => setLanguage('en')}>EN</button>;
  }
  render(<><Playground /><LanguageSwitch /></>, { wrapper: Providers });
  const crumb = screen.getByRole('link', { name: 'Проекты' });
  expect(crumb).toHaveAttribute('href', '/projects');
  expect(crumb.closest('.page-action-bar')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Playground' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Рабочая область' })).toBeInTheDocument();
  expect(screen.getByRole('tree', { name: 'Файлы рабочей области' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Удалить открытый файл' }));
  expect(await screen.findByText('Удалить main.js из рабочей области? Это действие нельзя отменить.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Запустить main.js' }));
  expect(await screen.findByText(/Не удалось выполнить этап «Установка зависимостей»/)).toBeInTheDocument();
  expect(screen.getByText('npm error')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'EN' }));
  expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument();
  expect(screen.getByText('Dependency install failed (exit 1).')).toBeInTheDocument();
});

it('runs an HTML file, keeps the editor open, restores the preview on reload, and stops it', async () => {
  const preview = {
    kind: 'preview', source: 'html', previewUrl: 'https://example.vercel.run/pages/index.html',
    runId: 'f02fe46c-a3d5-4bee-8f64-0ab151028a10', expiresAt: new Date(Date.now() + 30_000).toISOString(),
  };
  (authFetch as jest.Mock)
    .mockResolvedValueOnce({ ok: true, json: async () => preview })
    .mockResolvedValueOnce({ ok: true });
  const view = render(<Playground />, { wrapper: Providers });
  addFolder('pages');
  addFile('index.html');
  fireEvent.change(screen.getByRole('textbox', { name: 'pages/index.html' }), { target: { value: '<h1>Hello</h1>' } });
  expect(screen.getByText(/Preview files are public/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Run pages/index.html' }));
  const iframe = await screen.findByTitle('HTML preview');
  expect(iframe).toHaveAttribute('src', preview.previewUrl);
  expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  expect(screen.getByRole('textbox', { name: 'pages/index.html' })).toHaveValue('<h1>Hello</h1>');
  expect(JSON.parse((authFetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
    mode: 'files', entry: 'pages/index.html', folders: ['pages'],
  });
  view.unmount();
  render(<Playground />, { wrapper: Providers });
  expect(screen.getByTitle('HTML preview')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Workspace' })).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Stop preview' }));
  expect(await screen.findByRole('button', { name: 'Run pages/index.html' })).toBeInTheDocument();
  expect(screen.queryByTitle('HTML preview')).not.toBeInTheDocument();
  expect(authFetch).toHaveBeenLastCalledWith('/api/playground?runId=' + preview.runId, { method: 'DELETE' });
});

it('blocks an HTML preview when shared runtime is enough only for a script', async () => {
  (fetch as jest.Mock).mockResolvedValue(mockBudget({ ...demoBudget, remainingSeconds: 60 }));
  render(<Playground />, { wrapper: Providers });
  await screen.findByText('0h 01m 00s');
  expect(screen.getByRole('button', { name: 'Run main.js' })).toBeEnabled();
  addFile('index.html');
  expect(screen.getByRole('button', { name: 'Run index.html' })).toBeDisabled();
});

it('sends both npm manifests with the selected entry and separates dependency logs from script output', async () => {
  let finish!: (response: unknown) => void;
  (authFetch as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const files = [
    { name: 'main.ts', content: 'import isNumber from "is-number"; console.log(isNumber("42"));' },
    { name: 'package.json', content: '{"type":"module","dependencies":{"is-number":"7.0.0"}}' },
    { name: 'package-lock.json', content: '{"lockfileVersion":3,"packages":{}}' },
  ];
  sessionStorage.setItem('gareev-playground-files-v2', JSON.stringify({
    files, entry: 'main.ts', folders: [], expires: Date.now() + 60_000,
  }));
  render(<Playground />, { wrapper: Providers });
  fireEvent.click(screen.getByRole('button', { name: 'Run main.ts' }));
  expect(screen.getByRole('status')).toHaveTextContent('Preparing npm dependencies and running the file');
  expect(JSON.parse((authFetch as jest.Mock).mock.calls[0][1].body)).toEqual({ mode: 'files', entry: 'main.ts', files });
  finish({ ok: true, json: async () => ({ kind: 'output', installLogs: 'added 1 package', output: 'true', exitCode: 0 }) });
  expect(await screen.findByText('npm dependencies installed')).toBeInTheDocument();
  expect(screen.getByText('added 1 package')).toBeInTheDocument();
  expect(screen.getByText('Script output')).toBeInTheDocument();
  expect(screen.getByText('true')).toBeInTheDocument();
  expect(screen.getByText('main.ts · Exit code: 0')).toBeInTheDocument();
});
