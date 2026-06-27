'use client';

import React, { useEffect, useRef } from 'react';
import {
  useMarkdownEditor,
  MarkdownEditorView,
  wysiwygToolbarConfigs,
  markupToolbarConfigs,
} from '@gravity-ui/markdown-editor';
import { useToaster } from '@gravity-ui/uikit';
import '@gravity-ui/markdown-editor/styles/styles.css';
import { uploadImage } from '@/shared/lib/blog/uploadImage';
import { useI18n } from '@/app/contexts/I18nContext';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Image/file placed first so they're always visible regardless of container width.
// wToolbarConfig groups: [undo,redo] | [text formatting] | [block types] | [image,file,table,checkbox]
// We move the last group (media) to the front.
const { wToolbarConfig } = wysiwygToolbarConfigs;
const wysiwygToolbarConfig = [wToolbarConfig[3], ...wToolbarConfig.slice(0, 3)];

const { mToolbarConfig } = markupToolbarConfigs;
const markupToolbarConfig = [mToolbarConfig[mToolbarConfig.length - 1], ...mToolbarConfig.slice(0, -1)];

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder,
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const { add: addToast } = useToaster();
  const { t } = useI18n();

  const editor = useMarkdownEditor({
    initial: { markup: content },
    md: { html: true, breaks: true, linkify: true },
    handlers: {
      uploadFile: async (file) => {
        try {
          const url = await uploadImage(file);
          return { url };
        } catch (err) {
          addToast({
            theme: 'danger',
            name: 'image-upload-error',
            title: t('blogEditor.uploadErrorTitle'),
            content: err instanceof Error ? err.message : t('blogEditor.uploadErrorText'),
            autoHiding: 5000,
          });
          throw err;
        }
      },
    },
    markupConfig: {
      placeholder: placeholder ?? undefined,
    },
  });

  useEffect(() => {
    const handler = () => {
      onChangeRef.current(editor.getValue());
    };
    editor.on('change', handler);
    return () => {
      editor.off('change', handler);
    };
  }, [editor]);

  return (
    <div className="markdown-editor">
      <MarkdownEditorView
        editor={editor}
        stickyToolbar
        wysiwygToolbarConfig={wysiwygToolbarConfig}
        markupToolbarConfig={markupToolbarConfig}
      />
    </div>
  );
};
