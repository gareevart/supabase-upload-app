import { useState, useRef } from "react";
import { TextArea, Button, Icon } from '@gravity-ui/uikit';
import { GearBranches, Stop, ArrowUturnCwLeft } from '@gravity-ui/icons';
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import "./ChatMessageForm.css";

interface ChatMessageFormProps {
  onSubmit: (message: string) => Promise<void>;
  isMessageSending: boolean;
  disabled?: boolean;
}

export const ChatMessageForm = ({ 
  onSubmit, 
  isMessageSending,
  disabled = false 
}: ChatMessageFormProps) => {
  const { reasoningMode, setReasoningMode, selectedModel } = useModelSelection();
  const [messageText, setMessageText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || isMessageSending || disabled) return;
    
    const message = messageText;
    setMessageText("");
    
    try {
      await onSubmit(message);
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message if failed
      setMessageText(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="chat-message-form p-4 flex items-end gap-2"
    >
      <TextArea
        ref={textareaRef}
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Писать сюда..."
        maxRows={8}
        disabled={disabled}
        className="chat-message-form__textarea"
      />
      <div className="chat-message-form__toolbar">
        {/* Show reasoning button only for YandexGPT */}
        {selectedModel === 'yandexgpt' && (
          <Button
            size="m"
            view={reasoningMode ? "action" : "outlined"}
            onClick={() => setReasoningMode(!reasoningMode)}
            title={reasoningMode ? "Отключить режим рассуждений" : "Включить режим рассуждений"}
            disabled={disabled}
            className={`chat-message-form__button chat-message-form__button--reasoning ${reasoningMode ? 'active' : ''}`}
          >
            <Icon data={GearBranches} size={16} />
          </Button>
        )}
        <Button
          type="submit"
          size="m"
          disabled={!messageText.trim() || isMessageSending || disabled}
          className="chat-message-form__button chat-message-form__button--submit"
        >
          {isMessageSending ? (
            <Icon data={Stop} size={16} />
          ) : (
            <Icon data={ArrowUturnCwLeft} size={16} />
          )}
        </Button>
      </div>
    </form>
  );
};

