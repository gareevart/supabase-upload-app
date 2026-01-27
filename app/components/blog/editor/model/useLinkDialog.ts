import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { useToast } from '@/hooks/use-toast';

type ToastFn = ReturnType<typeof useToast>['toast'];

export const useLinkDialog = (editor: Editor | null, toast: ToastFn) => {
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const openLinkDialog = useCallback(() => {
    if (!editor) return;

    const { href } = editor.getAttributes('link');
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to,
    );

    if (href) {
      setLinkUrl(href);
      setLinkText(selectedText || '');
    } else {
      setLinkUrl('');
      setLinkText(selectedText || '');
    }

    setIsLinkDialogOpen(true);
  }, [editor]);

  const addLink = useCallback(() => {
    try {
      if (!editor) return;

      if (!linkUrl) {
        toast({
          title: 'Error',
          description: 'Please enter a URL',
          variant: 'destructive',
        });
        return;
      }

      if (editor.state.selection.empty && linkText) {
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${linkUrl}">${linkText}</a>`)
          .run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: linkUrl })
          .run();
      }

      toast({
        title: 'Success',
        description: 'Link added successfully',
      });

      setLinkUrl('');
      setLinkText('');
      setIsLinkDialogOpen(false);
    } catch (error) {
      console.error('Error adding link:', error);
      toast({
        title: 'Error',
        description: 'Failed to add link',
        variant: 'destructive',
      });
    }
  }, [editor, linkText, linkUrl, toast]);

  return {
    isLinkDialogOpen,
    setIsLinkDialogOpen,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    openLinkDialog,
    addLink,
  };
};
