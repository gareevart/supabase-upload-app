import React from 'react';
import type { Editor } from '@tiptap/react';
import { Button, DropdownMenu, Icon } from '@gravity-ui/uikit';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Picture,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  MagicWand,
  ListUl,
  Strikethrough,
  Code,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  ListOl,
  ArrowUturnCcwLeft,
  ArrowUturnCwRight,
} from '@gravity-ui/icons';

type ToolbarProps = {
  editor: Editor;
  isScrolled: boolean;
  isUploading: boolean;
  onOpenLinkDialog: () => void;
  onOpenImageUrl: () => void;
  onUploadFile: (file: File) => void;
  onInsertImageGenerator: () => void;
};

const getCurrentHeadingLevel = (editor: Editor) => {
  for (let level = 1; level <= 4; level++) {
    if (editor.isActive('heading', { level })) {
      return level;
    }
  }
  return null;
};

const getHeadingIcon = (level: number | null) => {
  switch (level) {
    case 1:
      return <Icon data={Heading1} size={16} />;
    case 2:
      return <Icon data={Heading2} size={16} />;
    case 3:
      return <Icon data={Heading3} size={16} />;
    case 4:
      return <Icon data={Heading4} size={16} />;
    case 5:
      return <Icon data={Heading5} size={16} />;
    case 6:
      return <Icon data={Heading6} size={16} />;
    default:
      return <Icon data={Heading1} size={16} />;
  }
};

const handleHeadingSelect = (editor: Editor, level: number) => {
  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
};

export const Toolbar = ({
  editor,
  isScrolled,
  isUploading,
  onOpenLinkDialog,
  onOpenImageUrl,
  onUploadFile,
  onInsertImageGenerator,
}: ToolbarProps) => {
  const handleToolbarBackgroundMouseDown = (
    event: React.MouseEvent<HTMLDivElement>
  ) => {
    const target = event.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    editor.chain().focus().run();
    event.preventDefault();
  };

  const headingMenuItems = [
    {
      iconStart: <Icon size={16} data={Heading1} />,
      action: () => handleHeadingSelect(editor, 1),
      text: 'Heading 1',
    },
    {
      iconStart: <Icon size={16} data={Heading2} />,
      action: () => handleHeadingSelect(editor, 2),
      text: 'Heading 2',
    },
    {
      action: () => handleHeadingSelect(editor, 3),
      text: 'Heading 3',
      iconStart: <Icon size={16} data={Heading3} />,
    },
    {
      action: () => handleHeadingSelect(editor, 4),
      text: 'Heading 4',
      iconStart: <Icon size={16} data={Heading4} />,
    },
    {
      action: () => handleHeadingSelect(editor, 5),
      text: 'Heading 5',
      iconStart: <Icon size={16} data={Heading5} />,
    },
    {
      action: () => handleHeadingSelect(editor, 6),
      text: 'Heading 6',
      iconStart: <Icon size={16} data={Heading6} />,
    },
  ];

  return (
    <div
      className={`toolbar flex flex-wrap gap-1 p-2 border-b sticky top-0 z-10 shadow-sm ${isScrolled ? 'scrolled' : ''}`}
      onMouseDown={handleToolbarBackgroundMouseDown}
    >
      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        <Icon data={Bold} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        <Icon data={Italic} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
      >
        <Icon data={Strikethrough} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'is-active' : ''}
      >
        <Icon data={UnderlineIcon} size={16} />
      </Button>

      <DropdownMenu
        items={headingMenuItems}
        renderSwitcher={(props) => (
          <Button
            {...props}
            view="flat"
            size="m"
            className={getCurrentHeadingLevel(editor) ? 'is-active' : ''}
          >
            {getHeadingIcon(getCurrentHeadingLevel(editor))}
            <Icon data={ChevronDown} size={16} />
          </Button>
        )}
      />

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        <Icon data={ListUl} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'is-active' : ''}
      >
        <Icon data={ListOl} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
      >
        <Icon data={TextAlignLeft} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
      >
        <Icon data={TextAlignCenter} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
      >
        <Icon data={TextAlignRight} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
      >
        <Icon data={Code} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={onOpenLinkDialog}
        className={editor.isActive('link') ? 'is-active' : ''}
      >
        <Icon data={LinkIcon} size={16} />
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onUploadFile(file);
          };
          input.click();
        }}
        disabled={isUploading}
      >
        <Icon data={Picture} size={16} />
        {isUploading && <span className="ml-2">Uploading...</span>}
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={onOpenImageUrl}
      >
        <Icon data={Picture} size={16} />
        URL
      </Button>

      <Button
        view="flat"
        size="m"
        onClick={onInsertImageGenerator}
        title="Добавить генератор изображений"
      >
        <Icon data={MagicWand} size={16} />
        AI
      </Button>

      <div className="ml-auto flex gap-1">
        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Icon data={ArrowUturnCcwLeft} size={16} />
        </Button>

        <Button
          view="flat"
          size="m"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Icon data={ArrowUturnCwRight} size={16} />
        </Button>
      </div>
    </div>
  );
};
