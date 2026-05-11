'use client';

import React, { useEffect, useRef } from 'react';
import {
  useMarkdownEditor,
  MarkdownEditorView,
} from '@gravity-ui/markdown-editor';
import '@gravity-ui/markdown-editor/styles/styles.css';
import { uploadImage } from '@/shared/lib/blog/uploadImage';
import './MarkdownEditor.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  content,
  onChange,
  placeholder,
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useMarkdownEditor({
    initial: { markup: content },
    md: { html: true, breaks: true, linkify: true },
    handlers: {
      uploadFile: async (file) => {
        const url = await uploadImage(file);
        return { url };
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
      />
    </div>
  );
};
