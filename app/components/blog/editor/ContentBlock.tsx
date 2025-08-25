import React from "react";
import { Button } from '@gravity-ui/uikit';
import { TextArea } from '@gravity-ui/uikit';
import { EditorContent } from "@/app/components/blog/editor/types";
import { ChevronDown, ChevronUp, Image } from "lucide-react";
import YandexGPTTextGenerator from "../YandexGPTTextGenerator";
import MarkdownEditor from "../MarkdownEditor";
import NextImage from "next/image";


interface ContentBlockProps {
  block: EditorContent;
  index: number;
  isCurrentEditing: boolean;
  content: EditorContent[];
  onMoveBlock: (index: number, direction: "up" | "down") => void;
  onDeleteBlock: (index: number) => void;
  onContentChange: (index: number, value: string) => void;
  onAddContentBlock: (type: EditorContent["type"], index: number) => void;
  onBlockTypeChange: (index: number, type: "paragraph" | "heading", level?: 1 | 2) => void;
  onImageUpload: (index: number, file: File) => void;
  onAltTextChange: (index: number, value: string) => void;
  onTextGenerated: (text: string, index: number) => void;
}

const ContentBlock: React.FC<ContentBlockProps> = ({
  block,
  index,
  isCurrentEditing,
  content,
  onMoveBlock,
  onDeleteBlock,
  onContentChange,
  onAddContentBlock,
  onBlockTypeChange,
  onImageUpload,
  onAltTextChange,
  onTextGenerated
}) => {
  return (
    <div key={index} className="relative mb-4 border rounded p-4">
      <BlockToolbar
        index={index}
        block={block}
        content={content}
        onMoveBlock={onMoveBlock}
        onBlockTypeChange={onBlockTypeChange}
        onImageUpload={onImageUpload}
        onDeleteBlock={onDeleteBlock}
        onTextGenerated={onTextGenerated}
      />

      <BlockContent
        block={block}
        index={index}
        onContentChange={onContentChange}
        onAltTextChange={onAltTextChange}
      />

      {isCurrentEditing && (
        <Button
          variant="ghost"
          className="w-full mt-2 border border-dashed"
          onClick={() => onAddContentBlock("paragraph", index)}
        >
          + Добавить новый блок
        </Button>
      )}
    </div>
  );
};

// BlockToolbar component - упрощенная версия без старых элементов P, H1, H2
const BlockToolbar: React.FC<{
  index: number;
  block: EditorContent;
  content: EditorContent[];
  onMoveBlock: (index: number, direction: "up" | "down") => void;
  onBlockTypeChange: (index: number, type: "paragraph" | "heading", level?: 1 | 2) => void;
  onImageUpload: (index: number, file: File) => void;
  onDeleteBlock: (index: number) => void;
  onTextGenerated: (text: string, index: number) => void;
}> = ({ 
  index, 
  block, 
  content, 
  onMoveBlock, 
  onBlockTypeChange,
  onImageUpload,
  onDeleteBlock,
  onTextGenerated
}) => {
  return (
    <div className="flex gap-2 mb-2 flex-wrap">
      <Button 
        variant="outline" 
        size="m"
        className="min-w-9 min-h-9"
        onClick={() => onMoveBlock(index, "up")}
        disabled={index === 0}
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button 
        variant="outline" 
        size="m"
        className="min-w-9 min-h-9"
        onClick={() => onMoveBlock(index, "down")}
        disabled={index === content.length - 1}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      
      <Button 
        variant="outline"
        size="m"
        className="min-w-9 min-h-9"
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onImageUpload(index, file);
          };
          input.click();
        }}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Изображение</span>
      </Button>
      
      {(block.type === "paragraph" || block.type === "heading") && (
        <YandexGPTTextGenerator 
          onTextGenerated={(text) => onTextGenerated(text, index)}
          initialText={block.content}
        />
      )}
      
      <Button 
        variant="outline" 
        size="m"
        className="ml-auto text-red-500 min-w-9 min-h-9"
        onClick={() => onDeleteBlock(index)}
        disabled={content.length === 1}
      >
        &times;
      </Button>
    </div>
  );
};

// BlockContent component
const BlockContent: React.FC<{
  block: EditorContent;
  index: number;
  onContentChange: (index: number, value: string) => void;
  onAltTextChange: (index: number, value: string) => void;
}> = ({ block, index, onContentChange, onAltTextChange }) => {
  if (block.type === "image") {
    return (
      <div className="flex flex-col items-center">
        {block.url && (
          <NextImage
            src={block.url}
            alt={block.alt || "Загруженное изображение"}
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: 'auto', height: 'auto', maxHeight: '20rem' }}
            className="max-h-80 object-contain mb-2"
          />
        )}
        <TextArea
          value={block.alt || ""}
          onChange={(e) => onAltTextChange(index, e.target.value)}
          placeholder="Подпись к изображению"
          className="text-center"
        />
      </div>
    );
  }
  
  if (block.type === "heading") {
    return (
      <TextArea
        value={block.content}
        onChange={(e) => onContentChange(index, e.target.value)}
        placeholder={block.level === 1 ? "Заголовок 1" : "Заголовок 2"}
        className={block.level === 1 ? "text-2xl font-bold" : "text-xl font-bold"}
      />
    );
  }
  
  return (
    <MarkdownEditor
      value={block.content}
      onChange={(value) => onContentChange(index, value)}
      placeholder="Введите текст абзаца..."
      className="w-full"
    />
  );
};

export default ContentBlock;
