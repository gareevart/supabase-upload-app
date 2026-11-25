import '@testing-library/jest-dom';
import { I18nProvider, useI18n } from '@/app/contexts/I18nContext';
import { fireEvent, render, screen } from '@testing-library/react';
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
