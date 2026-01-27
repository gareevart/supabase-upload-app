import { useCallback, useEffect, useRef } from 'react';
import { useEditor } from '@tiptap/react';
import { normalizeTipTapContent } from '@/lib/tiptapConverter';
import { ImageGenerator } from '../../extensions/ImageGeneratorExtension';
import { extensions } from '../extensions';

type UseTipTapEditorProps = {
  content: string;
  onChange: (content: string) => void;
};

export const useTipTapEditor = ({ content, onChange }: UseTipTapEditorProps) => {
  const lastContentString = useRef<string>('');
  const isInternalUpdate = useRef<boolean>(false);
  const previousNormalizedContent = useRef<string>('');

  const editor = useEditor({
    extensions: [
      ...extensions,
      ImageGenerator,
    ],
    content: normalizeTipTapContent(content),
    onUpdate: useCallback(({ editor: tiptapEditor }: { editor: any }) => {
      const newContent = JSON.stringify(tiptapEditor.getJSON());
      if (newContent !== lastContentString.current) {
        lastContentString.current = newContent;
        isInternalUpdate.current = true;
        onChange(newContent);
      }
    }, [onChange]),
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content) {
      try {
        const normalizedContent = normalizeTipTapContent(content);

        if (normalizedContent !== previousNormalizedContent.current && !isInternalUpdate.current) {
          previousNormalizedContent.current = normalizedContent;

          const parsedContent = JSON.parse(normalizedContent);
          editor.commands.setContent(parsedContent, false);
        }

        isInternalUpdate.current = false;
      } catch (e) {
        console.error('Error setting editor content:', e);
      }
    }
  }, [editor, content]);

  return editor;
};
