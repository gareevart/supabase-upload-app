import { useState } from "react";
import { Button, Icon, Text } from "@gravity-ui/uikit";
import { ChevronDown, ChevronUp, GearBranches } from "@gravity-ui/icons";
import "./ReasoningBlock.css";

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ReasoningBlock = ({ content, isStreaming = false }: ReasoningBlockProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!content && !isStreaming) return null;

  return (
    <div className="reasoning-block">
      <div className="reasoning-block__header">
        <div className="reasoning-block__title-row">
          <Icon data={GearBranches} size={16} className="reasoning-block__icon" />
          <Text variant="body-2" className="reasoning-block__title">
            {isStreaming ? "Думаю..." : "Ход мыслей"}
          </Text>
        </div>
        <Button
          view="flat"
          size="s"
          onClick={() => setIsExpanded(!isExpanded)}
          className="reasoning-block__toggle"
        >
          <Icon data={isExpanded ? ChevronUp : ChevronDown} size={16} />
        </Button>
      </div>

      {isExpanded && (
        <div className="reasoning-block__body">
          <div className="reasoning-block__content">
            {content || (isStreaming && "Анализирую вопрос...")}
            {isStreaming && <span className="reasoning-block__cursor" />}
          </div>
        </div>
      )}
    </div>
  );
};
