
import React, { useState } from "react";
import { Button } from '@gravity-ui/uikit';
import { Eye, Edit } from "lucide-react";
import WYSIWYGEditor from "./WYSIWYGEditor";
import VisualEditor from "./editor/VisualEditor";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Введите текст...",
  className
}) => {
  const [isVisualMode, setIsVisualMode] = useState(false);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-end mb-2">
        <div className="flex border rounded-md">
          <Button
            variant={!isVisualMode ? "secondary" : "ghost"}
            size="m"
            onClick={() => setIsVisualMode(false)}
            className="rounded-r-none"
          >
            <Edit className="h-4 w-4 mr-1" />
            Редактор
          </Button>
          <Button
            variant={isVisualMode ? "secondary" : "ghost"}
            size="m"
            onClick={() => setIsVisualMode(true)}
            className="rounded-l-none"
          >
            <Eye className="h-4 w-4 mr-1" />
            Предпросмотр
          </Button>
        </div>
      </div>

      {isVisualMode ? (
        <VisualEditor
          content={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-h-[150px]"
        />
      ) : (
        <WYSIWYGEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </div>
  );
};

export default MarkdownEditor;
