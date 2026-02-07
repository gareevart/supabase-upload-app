import React from 'react';
import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react';
import { Button, Card, Icon } from '@gravity-ui/uikit';
import { Picture, TrashBin } from '@gravity-ui/icons';

type ImageBubbleMenuProps = {
  editor: Editor;
  onOpenImageResizeDialog: () => void;
  isImageCursorOnElement: () => boolean;
};

export const ImageBubbleMenu = ({
  editor,
  onOpenImageResizeDialog,
  isImageCursorOnElement,
}: ImageBubbleMenuProps) => (
  <BubbleMenu
    editor={editor}
    tippyOptions={{ duration: 100 }}
    shouldShow={({ state, from }) => {
      const node = state.doc.nodeAt(from);
      return node?.type.name === 'resizableImage';
    }}
  >
    <Card>
      <div className="flex shadow BubbleMenu p-1 gap-1">
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

        <Button
          view="flat"
          size="s"
          onClick={() => editor.chain().focus().deleteSelection().run()}
          title="Удалить изображение"
        >
          <Icon data={TrashBin} size={14} />
        </Button>
      </div>
    </Card>
  </BubbleMenu>
);
