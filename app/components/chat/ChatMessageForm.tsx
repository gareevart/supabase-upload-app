import { useState, useRef } from "react";
import { TextArea, Button, Icon } from '@gravity-ui/uikit';
import { Bulb, Stop, ArrowUturnCwLeft } from '@gravity-ui/icons';
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { FileUploader, FileAttachment } from "./FileUploader";
import "./ChatMessageForm.css";

interface ChatMessageFormProps {
  onSubmit: (message: string, files?: FileAttachment[]) => Promise<void>;
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
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Allow sending if there's text or files attached
    if ((!messageText.trim() && attachedFiles.length === 0) || isMessageSending || disabled) return;
    
    const message = messageText;
    const files = attachedFiles;
    setMessageText("");
    setAttachedFiles([]);
    
    try {
      await onSubmit(message, files.length > 0 ? files : undefined);
    } catch (error) {
      console.error("Error sending message:", error);
      // Restore message and files if failed
      setMessageText(message);
      setAttachedFiles(files);
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
      className="chat-message-form p-4"
    >
      {/* Show attached files list if any */}
      {attachedFiles.length > 0 && (
        <div className="chat-message-form__files-list mb-2">
          <FileUploader
            files={attachedFiles}
            onFilesChange={setAttachedFiles}
            disabled={disabled || isMessageSending}
            maxFiles={3}
            maxFileSize={10 * 1024 * 1024} // 10MB
            compact={false}
          />
        </div>
      )}

      {/* Message input and buttons */}
      <div className="chat-message-form__input-row flex items-end gap-2">
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
          {/* File upload button - always visible, on the left */}
          <FileUploader
            files={attachedFiles}
            onFilesChange={setAttachedFiles}
            disabled={disabled || isMessageSending}
            maxFiles={3}
            maxFileSize={10 * 1024 * 1024} // 10MB
            compact={true}
          />
          
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
              <Icon data={Bulb} size={16} />
            </Button>
          )}
          
          <Button
            type="submit"
            size="m"
            disabled={(!messageText.trim() && attachedFiles.length === 0) || isMessageSending || disabled}
            className="chat-message-form__button chat-message-form__button--submit"
          >
            {isMessageSending ? (
              <Icon data={Stop} size={16} />
            ) : (
              <Icon data={ArrowUturnCwLeft} size={16} />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

