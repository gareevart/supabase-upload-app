
import React, { useState } from "react";
import { Button } from '@gravity-ui/uikit';
import { Eye, Pencil } from "@gravity-ui/icons";
import { Icon } from "@gravity-ui/uikit";
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
            <Icon data={Pencil} size={16} className="mr-1" />
            Редактор
          </Button>
          <Button
            variant={isVisualMode ? "secondary" : "ghost"}
            size="m"
            onClick={() => setIsVisualMode(true)}
            className="rounded-l-none"
          >
            <Icon data={Eye} size={16} className="mr-1" />
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
