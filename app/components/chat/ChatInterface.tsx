import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useChat, Message, FileAttachment } from "@/hooks/useChat";
import { DialogFooter } from "@/app/components/ui/dialog";
import ReactMarkdown from 'react-markdown';
import { Button, TextArea, Icon, Modal, Text, Spin, Label, useToaster, Select } from '@gravity-ui/uikit';
import { Gear, Copy } from '@gravity-ui/icons';
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { ReasoningBlock } from "./ReasoningBlock";
import { ChatMessageForm } from "./ChatMessageForm";
import "./ChatInterface.css";

interface ChatInterfaceProps {
  chatId: string;
}

export const ChatInterface = ({ chatId }: ChatInterfaceProps) => {
  const {
    chat,
    messages,
    isLoading,
    error,
    sendMessage,
    updateSystemPrompt,
    isMessageSending,
    isAssistantTyping,
  } = useChat(chatId);
  
  // Use the toaster hook
  const toaster = useToaster();
  const { reasoningMode, selectedModel, setSelectedModel } = useModelSelection();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [currentReasoning, setCurrentReasoning] = useState("");
  const [isReasoningActive, setIsReasoningActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (chat?.system_prompt) {
      setSystemPrompt(chat.system_prompt);
    }
  }, [chat]);

  // Log model changes for debugging
  useEffect(() => {
    console.log('ChatInterface: selectedModel changed to:', selectedModel);
  }, [selectedModel]);

  // Log reasoning mode changes for debugging
  useEffect(() => {
    console.log('ChatInterface: reasoningMode changed to:', reasoningMode);
  }, [reasoningMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMessageSubmit = async (message: string, files?: FileAttachment[]) => {
    // Reset reasoning state
    setCurrentReasoning("");
    setIsReasoningActive(false);
    
    try {
      // Start reasoning if in reasoning mode and using YandexGPT
      if (reasoningMode && selectedModel === 'yandexgpt') {
        setIsReasoningActive(true);
      }
      
      await sendMessage.mutateAsync({ content: message, attachments: files });
      
      // Stop reasoning when done
      setIsReasoningActive(false);
    } catch (error) {
      console.error("Error sending message:", error);
      setIsReasoningActive(false);
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleSaveSettings = async () => {
    try {
      await updateSystemPrompt.mutateAsync(systemPrompt);
      setOpen(false);
      toaster.add({
        name: 'settings-saved',
        title: 'Системный промпт сохранен',
        theme: 'success',
        autoHiding: 3000,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toaster.add({
        name: 'settings-error',
        title: 'Ошибка!',
        content: 'Ошибка при сохранении настроек',
        theme: 'danger',
        autoHiding: 5000,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="xs"/>
      </div>
    );
  }

  if (error) {
    return (
      <Text variant="subheader-2" color="danger">Error loading chat</Text>
    );
  }

  if (!chat) {
    return (
      <div className="text-center p-4">
        Чат не найден или был удален.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 gap-2 justify-between flex items-center">
        <div className="flex gap-2">
            {reasoningMode && selectedModel === 'yandexgpt' && (
              <Label theme="info" size="m">
                Режим рассуждений
              </Label>
            )}
          {chat.tokens_used && (
              <Label theme="unknown" size="m" value={chat.tokens_used.toString()}>Использовано токенов</Label>
          )}
        </div>

          <Button 
          variant="outline" 
          size="m" 
          onClick={() => setOpen(true)}
          title="Настройки"
          >
           <Icon data={Gear} size={18} />
          </Button>  
      </header>

      <div className="flex-1 overflow-y-auto p-4 chat-messages">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="chat-empty-state">
              <Text variant="header-1" className="mb-2">Начните общение с ассистентом</Text>
              <Text variant="body-1" className="mb-1" color="complementary">Задайте вопрос или опишите, что вам нужно</Text>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onCopy={(content) => {
                  navigator.clipboard.writeText(content);
                  toaster.add({
                    name: 'copy-notification',
                    title: 'Успешно!',
                    content: 'Скопировано в буфер обмена',
                    theme: 'success',
                    autoHiding: 3000,
                  });
                }}
              />
            ))}
            {isReasoningActive && selectedModel === 'yandexgpt' && (
              <ReasoningBlock 
                content={currentReasoning} 
                isStreaming={isReasoningActive}
              />
            )}
            {isAssistantTyping && (
              <div className="flex items-center gap-2 py-2 px-4 bg-muted rounded-lg w-fit">
                <div className="text-sm">Ассистент печатает</div>
                <Spin size="xs"/>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatMessageForm
        onSubmit={handleMessageSubmit}
        isMessageSending={isMessageSending}
      />

      <Modal className="modal" open={open} onClose={() => setOpen(false)}>
        <Text variant="header-1">Настройки чата</Text>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Text variant="body-1">Модель ИИ</Text>
              <Text variant="body-1" color="secondary"className="flex gap-1">Будет применена только для этого чата</Text>
              <Select
                value={[selectedModel]}
                options={[
                  { value: 'yandexgpt', content: 'YandexGPT' },
                  { value: 'yandexgpt-lite', content: 'YandexGPT Lite' },
                  { value: 'deepseek', content: 'Deepseek R1' },
                  { value: 'gpt-oss-20b', content: 'GPT OSS 20B (недоступна)', disabled: true }
                ]}
                onUpdate={(value) => {
                  if (value.length > 0) {
                    const newModel = value[0] as "yandexgpt" | "yandexgpt-lite" | "deepseek" | "gpt-oss-20b";
                    setSelectedModel(newModel);
                  }
                }}
                size="m"
                width="max"
                placeholder="Выберите модель"
              />
            </div>
            <div className="space-y-2">
              <Text variant="body-1">Системный промпт (роль ассистента)</Text>
              <Text variant="body-1" color="secondary"className="flex gap-1">Определяет роль и поведение ассистента в этом чате</Text>             
              <TextArea
                placeholder="Опишите, как должен вести себя ассистент, например: Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
            size="l"
              view="outlined"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              view="action"
              size="l" onClick={handleSaveSettings}>
              Сохранить
            </Button>
          </DialogFooter>
      </Modal>    
    </div>
  );
};

interface ChatMessageProps {
  message: Message;
  onCopy: (content: string) => void;
}

const ChatMessage = ({ message, onCopy }: ChatMessageProps) => {
  const isUser = message.role === "user";
  
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('sheet')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  
  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div className="chat-message-wrapper group">
        <div
          className={`rounded-lg p-2 max-w-[80%] ${
            isUser
              ? "chat-bubble bg-primary text-primary-foreground"
              : "bg-muted text-foreground bg-primary"
          }`}
        >
          {/* Show attachments if present */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="chat-message-attachments mb-3">
              {message.attachments.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chat-message-attachment"
                >
                  <span className="chat-message-attachment__icon">
                    {file.type.startsWith('image/') ? (
                      <Image 
                        src={file.url} 
                        alt={file.name}
                        width={200}
                        height={200}
                        className="chat-message-attachment__image"
                        unoptimized={file.url.includes('yandexcloud.net')}
                      />
                    ) : (
                      <span className="chat-message-attachment__file-icon">
                        {getFileIcon(file.type)}
                      </span>
                    )}
                  </span>
                  <div className="chat-message-attachment__info">
                    <Text variant="body-2" className="chat-message-attachment__name">
                      {file.name}
                    </Text>
                    <Text variant="caption-2" color="secondary">
                      {formatFileSize(file.size)}
                    </Text>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Message content */}
          {message.content && (
            <div className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Copy button below message */}
        <Button
          view="flat" 
          size="s" 
          className="chat-copy-button opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onCopy(message.content)}
        >
          <Icon data={Copy} size={18} />
        </Button>
      </div>
    </div>
  );
};
