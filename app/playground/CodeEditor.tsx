'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { Annotation, Compartment, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { useThemeType } from '@gravity-ui/uikit';
import { oneDark } from '@codemirror/theme-one-dark';
import { useI18n } from '@/app/contexts/I18nContext';
import editorRu from './Playground.i18n/editor.ru.json';

const externalChange = Annotation.define<boolean>();

const skin = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--g-color-base-background)', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-content': { padding: '13px 0', caretColor: 'var(--g-color-text-primary)' },
  '.cm-line': { padding: '0 10px' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', lineHeight: '1.7', overflow: 'auto' },
  '.cm-gutters': { backgroundColor: 'var(--g-color-base-background)', color: 'var(--g-color-text-secondary)', border: 0 },
  '.cm-lineNumbers .cm-gutterElement': { minWidth: '34px', padding: '0 5px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--g-color-base-generic)' },
});

const russianPhrases = EditorState.phrases.of(editorRu);

type Props = { name: string; value: string; disabled: boolean; onChange: (value: string) => void; onRun: () => void };

export default function CodeEditor(props: Props) {
  const dark = useThemeType() === 'dark';
  const { language: siteLanguage } = useI18n();
  const russian = siteLanguage === 'ru';
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef(props);
  const readonly = useRef(new Compartment()).current;
  const theme = useRef(new Compartment()).current;
  const phrases = useRef(new Compartment()).current;

  useEffect(() => { callbacks.current = props; }, [props]);

  useEffect(() => {
    if (!mount.current) return;
    const name = props.name;
    const language = /\.py$/i.test(name) ? python() : /\.[cm]?[jt]s$/i.test(name)
      ? javascript({ typescript: /\.[cm]?ts$/i.test(name) }) : [];
    const editor = new EditorView({
      parent: mount.current,
      state: EditorState.create({
        doc: callbacks.current.value,
        extensions: [
          basicSetup, skin, language, theme.of([]), phrases.of([]),
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
  }, [props.name, readonly, theme, phrases]);

  useEffect(() => {
    view.current?.dispatch({ effects: theme.reconfigure(dark ? oneDark : []) });
  }, [dark, props.name, theme]);

  useEffect(() => {
    view.current?.dispatch({ effects: phrases.reconfigure(russian ? russianPhrases : []) });
  }, [russian, props.name, phrases]);

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
