import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import CodeEditor from '../CodeEditor';

it('renders the real CodeMirror gutter, switches language, edits code and supports Ctrl+Enter', () => {
  const changed = jest.fn();
  const run = jest.fn();
  const props = { disabled: false, onChange: changed, onRun: run };
  const view = render(<CodeEditor {...props} name="main.ts" value="const x: number = 42;" />);
  const editor = screen.getByLabelText('main.ts');
  expect(view.container.querySelector('.cm-lineNumbers')).toBeInTheDocument();
  expect(view.container.querySelector('.cm-line span')).toBeInTheDocument();
  const instance = EditorView.findFromDOM(editor);
  if (!instance) throw new Error('No CodeMirror view');
  act(() => instance.dispatch({ changes: { from: instance.state.doc.length, insert: '\nconsole.log(x);' } }));
  expect(changed).toHaveBeenCalledWith('const x: number = 42;\nconsole.log(x);');
  fireEvent.keyDown(editor, { key: 'Enter', code: 'Enter', keyCode: 13, ctrlKey: true });
  expect(run).toHaveBeenCalledTimes(1);
  view.rerender(<CodeEditor {...props} name="main.py" value="print(42)" />);
  expect(screen.getByLabelText('main.py')).toHaveTextContent('print(42)');
});

it('applies a restored draft to the open filename without emitting a user edit', () => {
  const changed = jest.fn();
  const props = { disabled: false, onChange: changed, onRun: jest.fn(), name: 'main.js' };
  const view = render(<CodeEditor {...props} value="console.log(1);" />);
  view.rerender(<CodeEditor {...props} value="console.log(42);" />);
  expect(screen.getByLabelText('main.js')).toHaveTextContent('console.log(42);');
  expect(changed).not.toHaveBeenCalled();
});
