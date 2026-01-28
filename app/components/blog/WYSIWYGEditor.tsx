
import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { Textarea } from "@/app/components/ui/textarea";
import FormattingToolbar from './editor/FormattingToolbar';
import LinkDialog from './editor/LinkDialog';
import ImageDialog from './editor/ImageDialog';
import { useTextFormatting } from '@/hooks/editor/useTextFormatting';

interface WYSIWYGEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const WYSIWYGEditor: React.FC<WYSIWYGEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Введите текст...",
  className 
}) => {
  const [text, setText] = useState(value);
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  
  const {
    textareaRef,
    handleSelectionChange,
    hasFormat,
    applyFormatting,
    applyList,
    applyAlignment,
    insertTextAtSelection,
    getSelectedText
  } = useTextFormatting(text, setText, onChange);

  // Sync value with text state
  useEffect(() => {
    setText(value);
  }, [value]);

  // Auto-resize function
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text, textareaRef]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange(newText);
  };
  
  // Handle dialogs for links and images
  const handleOpenDialog = (type: string) => {
    setOpenDialog(type);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(null);
  };
  
  const handleAddLink = (url: string, linkText: string) => {
    const markdown = linkText.trim() 
      ? `[${linkText}](${url})`
      : `<${url}>`;
    
    insertTextAtSelection(markdown);
  };
  
  const handleAddImage = (url: string, alt: string) => {
    const markdown = `![${alt}](${url})`;
    insertTextAtSelection(markdown);
  };

  const handleToolbarBackgroundClick = () => {
    textareaRef.current?.focus();
  };

  return (
    <div className={cn("w-full", className)}>
      <FormattingToolbar
        hasFormat={hasFormat}
        applyFormatting={applyFormatting}
        applyList={applyList}
        applyAlignment={applyAlignment}
        onOpenDialog={handleOpenDialog}
        onToolbarBackgroundClick={handleToolbarBackgroundClick}
      />
      
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        placeholder={placeholder}
        className="min-h-[150px] resize-none font-mono"
      />
      
      <LinkDialog
        isOpen={openDialog === 'link'}
        onClose={handleCloseDialog}
        onAddLink={handleAddLink}
        initialText={getSelectedText()}
      />
      
      <ImageDialog
        isOpen={openDialog === 'image'}
        onClose={handleCloseDialog}
        onAddImage={handleAddImage}
      />
    </div>
  );
};

export default WYSIWYGEditor;
