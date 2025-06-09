
import React from "react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface VisualEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const VisualEditor: React.FC<VisualEditorProps> = ({
  content,
  onChange,
  placeholder = "Введите текст...",
  className
}) => {
  return (
    <div 
      className={cn(
        "min-h-[150px] p-3 border rounded-md bg-background prose prose-sm max-w-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => {
        const target = e.target as HTMLDivElement;
        onChange(target.textContent || "");
      }}
      onBlur={(e) => {
        const target = e.target as HTMLDivElement;
        onChange(target.textContent || "");
      }}
      style={{ whiteSpace: "pre-wrap" }}
    >
      {content ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <div className="text-muted-foreground">{placeholder}</div>
      )}
    </div>
  );
};

export default VisualEditor;
