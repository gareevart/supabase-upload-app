import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { TextEncoder } from 'node:util';
import Playground from '../Playground';
import { authFetch } from '@/lib/auth-fetch';

jest.mock('@/lib/auth-fetch', () => ({ authFetch: jest.fn() }));
jest.mock('@gravity-ui/uikit', () => ({
  Button: ({ children, disabled, onClick, type, 'aria-pressed': pressed }: ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button disabled={disabled} onClick={onClick} type={type} aria-pressed={pressed}>{children}</button>,
  Text: ({ children, as: Tag = 'span' }: { children: ReactNode; as?: 'h1' | 'h2' | 'p' | 'span' }) =>
    <Tag>{children}</Tag>,
}));

beforeEach(() => {
  Object.assign(globalThis, { TextEncoder });
  sessionStorage.clear();
  jest.clearAllMocks();
});

const addFile = (name: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'New filename' }), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'New file' }));
};

it.each([
  ['script.js', 'console.log(4)'],
  ['script.ts', 'const value: number = 4; console.log(value)'],
  ['script.py', 'print(4)'],
])('creates and runs the selected %s file, then restores the draft after reload', async (name, content) => {
  (authFetch as jest.Mock).mockResolvedValue({
    ok: true, json: async () => ({ kind: 'output', output: '4', exitCode: 0 }),
  });
  const view = render(<Playground />);
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
  render(<Playground />);
  expect(screen.getByRole('textbox', { name })).toHaveValue(content);
});

it('keeps unsent files when switching to the independent GitHub import mode', () => {
  render(<Playground />);
  addFile('custom.py');
  fireEvent.change(screen.getByRole('textbox', { name: 'custom.py' }), { target: { value: 'print(1)' } });
  fireEvent.click(screen.getByRole('radio', { name: 'GitHub / Vite' }));
  expect(screen.getByRole('button', { name: 'Import and run' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: 'Workspace' }));
  expect(screen.getByRole('textbox', { name: 'custom.py' })).toHaveValue('print(1)');
});
