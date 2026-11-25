import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { ThemeProvider } from '@gravity-ui/uikit';
import { I18nProvider } from '@/app/contexts/I18nContext';
import CodeEditor from '../CodeEditor';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: (query: string) => ({
    media: query, matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
  }) });
});

function TestEditor({ theme = 'light', ...props }: React.ComponentProps<typeof CodeEditor> & { theme?: 'light' | 'dark' }) {
  return <ThemeProvider theme={theme} scoped><I18nProvider><CodeEditor {...props} /></I18nProvider></ThemeProvider>;
}

it('renders the real CodeMirror gutter, switches language, edits code and supports Ctrl+Enter', () => {
  const changed = jest.fn();
  const run = jest.fn();
  const props = { disabled: false, onChange: changed, onRun: run };
  const view = render(<TestEditor {...props} name="main.ts" value="const x: number = 42;" />);
  const editor = screen.getByLabelText('main.ts');
  expect(view.container.querySelector('.cm-lineNumbers')).toBeInTheDocument();
  expect(view.container.querySelector('.cm-line span')).toBeInTheDocument();
  const instance = EditorView.findFromDOM(editor);
  if (!instance) throw new Error('No CodeMirror view');
  act(() => instance.dispatch({ changes: { from: instance.state.doc.length, insert: '\nconsole.log(x);' } }));
  expect(changed).toHaveBeenCalledWith('const x: number = 42;\nconsole.log(x);');
  fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter', keyCode: 13, ctrlKey: true });
  expect(run).toHaveBeenCalledTimes(1);
  view.rerender(<TestEditor {...props} name="main.py" value="print(42)" />);
  expect(screen.getByLabelText('main.py')).toHaveTextContent('print(42)');
});

it('applies a restored draft to the open filename without emitting a user edit', () => {
  const changed = jest.fn();
  const props = { disabled: false, onChange: changed, onRun: jest.fn(), name: 'main.js' };
  const view = render(<TestEditor {...props} value="console.log(1);" />);
  view.rerender(<TestEditor {...props} value="console.log(42);" />);
  expect(screen.getByLabelText('main.js')).toHaveTextContent('console.log(42);');
  expect(changed).not.toHaveBeenCalled();
});

it('applies the site theme without recreating the editor or emitting a user edit', () => {
  localStorage.setItem('app-language', 'ru');
  const onChange = jest.fn();
  const props = { name: 'main.js', value: 'console.log(42)', disabled: false, onChange, onRun: jest.fn() };
  const view = render(<TestEditor {...props} />);
  const dom = screen.getByLabelText('main.js');
  const editor = EditorView.findFromDOM(dom);
  expect(editor?.state.facet(EditorView.darkTheme)).toBe(false);
  expect(editor?.state.phrase('Find')).toBe('Найти');
  view.rerender(<TestEditor {...props} theme="dark" />);
  expect(EditorView.findFromDOM(dom)).toBe(editor);
  expect(editor?.state.facet(EditorView.darkTheme)).toBe(true);
  expect(editor?.state.doc.toString()).toBe(props.value);
  expect(onChange).not.toHaveBeenCalled();
});
