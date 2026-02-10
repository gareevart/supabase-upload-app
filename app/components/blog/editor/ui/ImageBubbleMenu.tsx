"use client";

import React, { useMemo } from 'react';
import type { Editor } from '@tiptap/react';
import { Button, Card, Icon } from '@gravity-ui/uikit';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Picture,
  Strikethrough,
} from '@gravity-ui/icons';

type ImageBubbleMenuProps = {
  editor: Editor;
  onOpenLinkDialog: () => void;
  onOpenImageResizeDialog: () => void;
  isImageCursorOnElement: () => boolean;
};

export const ImageBubbleMenu = ({
  editor,
  onOpenLinkDialog,
  onOpenImageResizeDialog,
  isImageCursorOnElement,
}: ImageBubbleMenuProps) => {
  // Check if we should show the menu
  const shouldShowMenu = useMemo(() => {
    const { state } = editor;
    const { from } = state.selection;
    const node = state.doc.nodeAt(from);
    return node?.type.name === 'resizableImage';
  }, [editor]);

  if (!shouldShowMenu) {
    return null;
  }

  return (
    <Card>
      <div className="flex shadow BubbleMenu p-1 gap-1">
        <Button
          view="flat"
          size="s"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          <Icon data={Bold} size={14} />
        </Button>

        <Button
          view="flat"
          size="s"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
        >
          <Icon data={Strikethrough} size={14} />
        </Button>

        <Button
          view="flat"
          size="s"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          <Icon data={Italic} size={14} />
        </Button>

        <Button
          view="flat"
          size="s"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'is-active' : ''}
        >
          <Icon data={UnderlineIcon} size={14} />
        </Button>

        <Button
          view="flat"
          size="s"
          onClick={onOpenLinkDialog}
          className={editor.isActive('link') ? 'is-active' : ''}
        >
          <Icon data={LinkIcon} size={14} />
        </Button>

        <Button
          view="flat"
          size="s"
          onClick={onOpenImageResizeDialog}
          className={isImageCursorOnElement() ? 'is-active' : ''}
          disabled={!isImageCursorOnElement()}
          title="Изменить размер"
        >
          <Icon data={Picture} size={14} />
        </Button>
      </div>
    </Card>
  );
};
