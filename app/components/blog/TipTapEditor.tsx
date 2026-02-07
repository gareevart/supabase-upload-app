"use client";

import React, { useEffect, useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { Card } from '@gravity-ui/uikit';
import "../../blog/blog.css";
import './editor/editor.css';
import './editor/drag-handle.css';
import { useToast } from '@/hooks/use-toast';
import { useTipTapEditor } from './editor/model/useTipTapEditor';
import { useLinkDialog } from './editor/model/useLinkDialog';
import { useImageUpload } from './editor/model/useImageUpload';
import { useImageResize } from './editor/model/useImageResize';
import { Toolbar } from './editor/ui/Toolbar';
import { ImageBubbleMenu } from './editor/ui/ImageBubbleMenu';
import { LinkDialog } from './editor/ui/LinkDialog';
import { ImageUrlDialog } from './editor/ui/ImageUrlDialog';
import { ImageResizeDialog } from './editor/ui/ImageResizeDialog';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
}) => {
  const editor = useTipTapEditor({ content, onChange });
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);

  const {
    isLinkDialogOpen,
    setIsLinkDialogOpen,
    linkUrl,
    setLinkUrl,
    linkText,
    setLinkText,
    openLinkDialog,
    addLink,
  } = useLinkDialog(editor, toast);

  const {
    isImageDialogOpen,
    setIsImageDialogOpen,
    imageUrl,
    setImageUrl,
    imageAlt,
    setImageAlt,
    isUploading,
    handleImageUpload,
    addImageFromUrl,
  } = useImageUpload(editor, toast);

  const {
    isImageResizeModalOpen,
    setIsImageResizeModalOpen,
    currentImageWidth,
    setCurrentImageWidth,
    currentImageHeight,
    setCurrentImageHeight,
    openImageResizeDialog,
    applyImageResize,
    isImageCursorOnElement,
  } = useImageResize(editor, toast);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!editor) {
    return null;
  }

  const handleInsertImageGenerator = () => {
    (window as any).currentTipTapEditor = editor;
    editor.chain().focus().insertImageGenerator().run();
  };

  const handleEditorBackgroundMouseDown = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    if (event.target === event.currentTarget) {
      editor.chain().focus().run();
      event.preventDefault();
    }
  };

  return (
    <Card>
      <div className="tiptap-editor">
        <Toolbar
          editor={editor}
          isScrolled={isScrolled}
          isUploading={isUploading}
          onOpenLinkDialog={openLinkDialog}
          onOpenImageUrl={() => setIsImageDialogOpen(true)}
          onUploadFile={handleImageUpload}
          onInsertImageGenerator={handleInsertImageGenerator}
        />

        <EditorContent
          editor={editor}
          className="p-4 min-h-[300px] prose prose-lg max-w-none tiptap-editor-content tiptap-content"
          onMouseDown={handleEditorBackgroundMouseDown}
        />

        <ImageBubbleMenu
          editor={editor}
          onOpenImageResizeDialog={openImageResizeDialog}
          isImageCursorOnElement={isImageCursorOnElement}
        />

        <LinkDialog
          open={isLinkDialogOpen}
          onClose={() => setIsLinkDialogOpen(false)}
          linkUrl={linkUrl}
          onLinkUrlChange={setLinkUrl}
          linkText={linkText}
          onLinkTextChange={setLinkText}
          onSubmit={addLink}
        />

        <ImageUrlDialog
          open={isImageDialogOpen}
          onClose={() => setIsImageDialogOpen(false)}
          imageUrl={imageUrl}
          onImageUrlChange={setImageUrl}
          imageAlt={imageAlt}
          onImageAltChange={setImageAlt}
          onSubmit={addImageFromUrl}
        />

        <ImageResizeDialog
          open={isImageResizeModalOpen}
          onClose={() => setIsImageResizeModalOpen(false)}
          width={currentImageWidth}
          height={currentImageHeight}
          onWidthChange={setCurrentImageWidth}
          onHeightChange={setCurrentImageHeight}
          onSubmit={applyImageResize}
        />
      </div>
    </Card>
  );
};

export default TipTapEditor;
