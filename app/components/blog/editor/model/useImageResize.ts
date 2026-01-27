import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { useToast } from '@/hooks/use-toast';

type ToastFn = ReturnType<typeof useToast>['toast'];

export const useImageResize = (editor: Editor | null, toast: ToastFn) => {
  const [isImageResizeModalOpen, setIsImageResizeModalOpen] = useState(false);
  const [currentImageWidth, setCurrentImageWidth] = useState(0);
  const [currentImageHeight, setCurrentImageHeight] = useState(0);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);

  const openImageResizeDialog = useCallback(() => {
    if (!editor) return;

    const { from } = editor.state.selection;
    const node = editor.state.doc.nodeAt(from);
    if (node && node.type.name === 'resizableImage') {
      const attrs = node.attrs;
      setCurrentImageWidth(attrs.width || 0);
      setCurrentImageHeight(attrs.height || 0);
      setCurrentImageId(attrs.src || null);
      setIsImageResizeModalOpen(true);
    }
  }, [editor]);

  const applyImageResize = useCallback(() => {
    try {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      if (from !== to) {
        const startNode = editor.state.doc.nodeAt(from);
        if (startNode && startNode.type.name === 'resizableImage') {
          editor.commands.setNodeSelection(from);
        }
      }

      editor
        .chain()
        .focus()
        .updateAttributes('resizableImage', {
          width: currentImageWidth || null,
          height: currentImageHeight || null,
        })
        .run();

      toast({
        title: 'Success',
        description: 'Image size updated successfully',
      });

      setIsImageResizeModalOpen(false);
      setCurrentImageWidth(0);
      setCurrentImageHeight(0);
      setCurrentImageId(null);
    } catch (error) {
      console.error('Error updating image size:', error);
      toast({
        title: 'Error',
        description: 'Failed to update image size',
        variant: 'destructive',
      });
    }
  }, [currentImageHeight, currentImageWidth, editor, toast]);

  const isImageCursorOnElement = useCallback(() => {
    if (!editor) return false;

    const { from, to } = editor.state.selection;
    if (from !== to) return false;

    const node = editor.state.doc.nodeAt(from);
    return node?.type.name === 'resizableImage';
  }, [editor]);

  return {
    isImageResizeModalOpen,
    setIsImageResizeModalOpen,
    currentImageWidth,
    setCurrentImageWidth,
    currentImageHeight,
    setCurrentImageHeight,
    currentImageId,
    openImageResizeDialog,
    applyImageResize,
    isImageCursorOnElement,
  };
};
