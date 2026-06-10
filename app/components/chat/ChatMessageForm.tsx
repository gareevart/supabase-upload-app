import { useState, useRef } from "react";
import { TextArea, Button, Icon } from '@gravity-ui/uikit';
import { Bulb, Stop, ArrowUturnCwLeft, Globe, Circles3Plus } from '@gravity-ui/icons';
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { useI18n } from "@/app/contexts/I18nContext";
import { FileUploader, FileAttachment } from "./FileUploader";
import "./ChatMessageForm.css";

interface ChatMessageFormProps {
  onSubmit: (message: string, files?: FileAttachment[], useWebSearch?: boolean, useWidgetMode?: boolean) => Promise<void>;
  isMessageSending: boolean;
  disabled?: boolean;
  useWebSearch: boolean;
  onToggleWebSearch: () => void;
  useWidgetMode: boolean;
  onToggleWidgetMode: () => void;
}

export const ChatMessageForm = ({
  onSubmit,
  isMessageSending,
  disabled = false,
  useWebSearch,
  onToggleWebSearch,
  useWidgetMode,
  onToggleWidgetMode
}: ChatMessageFormProps) => {
  const { t } = useI18n();
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
      await onSubmit(message, files.length > 0 ? files : undefined, useWebSearch, useWidgetMode);
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
      className="chat-message-form"
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

      {/* Message input and controls */}
      <div className="chat-message-form__input-row">
        <TextArea
          ref={textareaRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything..."
          maxRows={8}
          disabled={disabled}
          className="chat-message-form__textarea"
        />
        <div className="chat-message-form__toolbar">
          <div className="chat-message-form__tools">
            {/* File upload button - always visible, on the left */}
            <FileUploader
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
              disabled={disabled || isMessageSending}
              maxFiles={3}
              maxFileSize={10 * 1024 * 1024} // 10MB
              compact={true}
            />

            <Button
              type="button"
              size="m"
              view={useWebSearch ? "action" : "outlined"}
              onClick={onToggleWebSearch}
              title={useWebSearch ? "Web-search enabled" : "Use web-search"}
              disabled={disabled}
              className="chat-message-form__button chat-message-form__button--web-search"
            >
              <Icon data={Globe} size={16} />
            </Button>

            <Button
              type="button"
              size="m"
              view={useWidgetMode ? "action" : "outlined"}
              onClick={onToggleWidgetMode}
              title={useWidgetMode ? t('chatForm.widgetModeOn') : t('chatForm.widgetModeOff')}
              disabled={disabled}
              className="chat-message-form__button chat-message-form__button--widget"
            >
              <Icon data={Circles3Plus} size={16} />
            </Button>

            {/* Show reasoning button only for YandexGPT */}
            {selectedModel === 'yandexgpt' && (
              <Button
                type="button"
                size="m"
                view={reasoningMode ? "action" : "outlined"}
                onClick={() => setReasoningMode(!reasoningMode)}
                title={reasoningMode ? "Disable reasoning mode" : "Enable reasoning mode"}
                disabled={disabled}
                className={`chat-message-form__button chat-message-form__button--reasoning ${reasoningMode ? 'active' : ''}`}
              >
                <Icon data={Bulb} size={16} />
              </Button>
            )}
          </div>

          <Button
            type="submit"
            size="m"
            view="action"
            className="chat-message-form__button chat-message-form__button--submit"
            disabled={(!messageText.trim() && attachedFiles.length === 0) || isMessageSending || disabled}
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

