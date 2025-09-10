import { useState } from "react";
import { Button, Icon, Text } from "@gravity-ui/uikit";
import { ChevronDown, ChevronUp, GearBranches } from "@gravity-ui/icons";

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ReasoningBlock = ({ content, isStreaming = false }: ReasoningBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!content && !isStreaming) return null;

  return (
    <div className="mb-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
      <div className="flex items-center justify-between p-3 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2">
          <Icon data={GearBranches} size={16} className="text-blue-600 dark:text-blue-400" />
          <Text variant="body-2" className="text-blue-800 dark:text-blue-200 font-medium">
            {isStreaming ? "Думаю..." : "Ход мыслей"}
          </Text>
        </div>
        <Button
          view="flat"
          size="s"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 dark:text-blue-400"
        >
          <Icon data={isExpanded ? ChevronUp : ChevronDown} size={16} />
        </Button>
      </div>
      
      {isExpanded && (
        <div className="p-3">
          <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
            {content || (isStreaming && "Анализирую вопрос...")}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-blue-600 animate-pulse" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
