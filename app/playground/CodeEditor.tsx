'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const externalChange = Annotation.define<boolean>();

const skin = EditorView.theme({
  '&': { height: '100%', backgroundColor: '#151922', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { padding: '13px 0', caretColor: '#b8d3ff' },
  '.cm-line': { padding: '0 10px' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', lineHeight: '1.7', overflow: 'auto' },
  '.cm-gutters': { backgroundColor: '#151922', color: '#7d879b', border: 0 },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '34px', padding: '0 5px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#1d2432' },
}, { dark: true });

type Props = { name: string; value: string; disabled: boolean; onChange: (value: string) => void; onRun: () => void };

export default function CodeEditor(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef(props);
  const readonly = useRef(new Compartment()).current;

  useEffect(() => { callbacks.current = props; }, [props]);

  useEffect(() => {
    if (!mount.current) return;
    const name = props.name;
    const language = name.endsWith('.py') ? python() : javascript({ typescript: name.endsWith('.ts') });
    const editor = new EditorView({
      parent: mount.current,
      state: EditorState.create({
        doc: callbacks.current.value,
        extensions: [
          basicSetup, oneDark, skin, language,
          readonly.of(EditorState.readOnly.of(callbacks.current.disabled)),
          EditorView.contentAttributes.of({ 'aria-label': name }),
          Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { callbacks.current.onRun(); return true; } }])),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !update.transactions.some((tx) => tx.annotation(externalChange))) {
              callbacks.current.onChange(update.state.doc.toString());
            }
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      view.current = null;
      editor.destroy();
    };
  }, [props.name, readonly]);

  useEffect(() => {
    view.current?.dispatch({ effects: readonly.reconfigure(EditorState.readOnly.of(props.disabled)) });
  }, [props.disabled, readonly]);

  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== props.value) {
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: props.value },
        annotations: externalChange.of(true),
      });
    }
  }, [props.value]);

  return <div ref={mount} style={{ height: '100%', minHeight: 0 }} />;
}
