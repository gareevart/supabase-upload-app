import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useChat, Message, FileAttachment } from "@/hooks/useChat";
import ReactMarkdown from 'react-markdown';
import { Button, TextArea, Icon, Dialog, Text, Spin, Label, List, Link, DropdownMenu, useToaster, Select, HelpMark, ClipboardButton } from '@gravity-ui/uikit';
import { Gear, Bars, Plus } from '@gravity-ui/icons';
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { ReasoningBlock } from "./ReasoningBlock";
import { ChatMessageForm } from "./ChatMessageForm";
import { useChatSidebar } from "./ChatSidebarContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMenu } from "@/shared/ui/DrawerMenu";
import { useCreateChat } from "@/hooks/useCreateChat";
import { parseMessageSegments } from "@/features/widget-runtime/lib/parseWidgetBlock";
import { WidgetPreviewCard } from "@/features/widget-generation/ui/WidgetPreviewCard";
import "./ChatInterface.css";
import "@/app/blog/blog.css";

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
  const { toggleSidebar, isMobileSidebarOpen } = useChatSidebar();
  const isMobile = useIsMobile();
  const { handleCreateChat, createChat } = useCreateChat();
  const [systemPrompt, setSystemPrompt] = useState("");
  const [currentReasoning, setCurrentReasoning] = useState("");
  const [isReasoningActive, setIsReasoningActive] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [useWidgetMode, setUseWidgetMode] = useState(false);
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

  const handleMessageSubmit = async (message: string, files?: FileAttachment[], useWebSearch?: boolean, useWidgetMode?: boolean) => {
    // Reset reasoning state
    setCurrentReasoning("");
    setIsReasoningActive(false);

    try {
      // Start reasoning if in reasoning mode and using YandexGPT
      if (reasoningMode && selectedModel === 'yandexgpt') {
        setIsReasoningActive(true);
      }

      await sendMessage.mutateAsync({
        content: message,
        attachments: files,
        useWebSearch: useWebSearch,
        useWidgetMode: useWidgetMode
      });

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
        <Spin size="xs" />
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
      <div className="chat-empty-state-container">
        <div className="chat-empty-state">
          <Text variant="header-1" className="chat-empty-title">
            Чат удален
          </Text>
          <Text variant="body-1" className="chat-empty-subtitle" color="secondary">
            Создайте новый чат и продолжайте общение.
          </Text>
          <div className="chat-empty-actions">
            <Button
              view="action"
              size="l"
              onClick={handleCreateChat}
              loading={createChat.isPending}
            >
              <Icon data={Plus} size={16} />
              Создать чат
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const settingsContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Text variant="body-1">Модель ИИ</Text>
        <Text variant="body-1" color="secondary" className="flex gap-1">Будет применена только для этого чата</Text>
        <Select
          value={[selectedModel]}
          options={[
            { value: 'yandexgpt', content: 'YandexGPT' },
            { value: 'yandexgpt-lite', content: 'YandexGPT Lite' },
            { value: 'deepseek', content: 'Deepseek R1' },
            { value: 'aliceai-llm', content: 'Alice AI LLM' },
          ]}
          onUpdate={(value) => {
            if (value.length > 0) {
              const newModel = value[0] as "yandexgpt" | "yandexgpt-lite" | "deepseek" | "gpt-oss-20b" | "aliceai-llm";
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
        <Text variant="body-1" color="secondary" className="flex gap-1">Определяет роль и поведение ассистента в этом чате</Text>
        <TextArea
          placeholder="Опишите, как должен вести себя ассистент, например: Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично."
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          className="resize-none"
        />
      </div>
    </div>
  );

  const settingsFooter = (
    <>
      <Button view="outlined" size="l" onClick={() => setOpen(false)}>
        Отмена
      </Button>
      <Button view="action" size="l" onClick={handleSaveSettings}>
        Сохранить
      </Button>
    </>
  );

  return (
    <div className="chat-interface">
      <header className="chat-interface__header">
        <div className="chat-interface__header-left">
          {/* Mobile burger button */}
          {isMobile && (
            <Button
              view="outlined"
              size="m"
              onClick={toggleSidebar}
              title="Открыть меню чатов"
              className={isMobileSidebarOpen ? 'opacity-0 pointer-events-none' : ''}
            >
              <Icon data={Bars} size={18} />
            </Button>
          )}

          <div className="chat-interface__status">
          {useWebSearch && (
              <Label theme="info" size="m">
                Web-search
              </Label>
            )}
            {useWidgetMode && (
              <Label theme="info" size="m">
                Widget mode
              </Label>
            )}
            {reasoningMode && selectedModel === 'yandexgpt' && (
              <Label theme="info" size="m">
                Thinking mode
              </Label>
            )}

          </div>
        </div>

        <div className="chat-interface__header-right">
          {(chat.tokens_used || 0) > 0 && (
            <HelpMark iconSize="m">
              <b>Использовано токенов:</b> {chat.tokens_used?.toString()}
            </HelpMark>
          )}
          <Button
            view="outlined"
            size="m"
            onClick={() => setOpen(true)}
            title="Настройки"
          >
            <Icon data={Gear} size={18} />
          </Button>

        </div>
      </header>

      <div className="chat-interface__messages chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state-container">
            <div className="chat-empty-state">
              <Text variant="header-1" className="chat-empty-title">Начните общение с ассистентом</Text>
              <Text variant="body-1" className="chat-empty-subtitle" color="complementary">
                Задайте вопрос или опишите, что вам нужно
              </Text>
            </div>
          </div>
        ) : (
          <div className="space-y-4 chat-messages-container">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCopy={() => { /* silent copy handled by ClipboardButton tooltip */ }}
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
                <div className="text-sm">Чат отвечает...</div>
                <Spin size="xs" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="chat-interface__form">
        <ChatMessageForm
          onSubmit={handleMessageSubmit}
          isMessageSending={isMessageSending}
          useWebSearch={useWebSearch}
          onToggleWebSearch={() => setUseWebSearch((prev) => !prev)}
          useWidgetMode={useWidgetMode}
          onToggleWidgetMode={() => setUseWidgetMode((prev) => !prev)}
        />
      </div>

      {isMobile ? (
        <DrawerMenu
          open={open}
          onClose={() => setOpen(false)}
          title="Настройки чата"
          footer={settingsFooter}
        >
          {settingsContent}
        </DrawerMenu>
      ) : (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          onEnterKeyDown={handleSaveSettings}
          aria-labelledby="chat-settings-dialog-title"
        >
          <Dialog.Header caption="Настройки чата" id="chat-settings-dialog-title" />
          <Dialog.Body>{settingsContent}</Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setOpen(false)}
            onClickButtonApply={handleSaveSettings}
            textButtonApply="Сохранить"
            textButtonCancel="Отмена"
          />
        </Dialog>
      )}
    </div>
  );
};

interface ChatMessageProps {
  message: Message;
  onCopy: (content: string) => void;
}

const ChatMessage = ({ message, onCopy }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const sources = message.metadata?.sources ?? [];
  const normalizedSources = sources
    .map((source) => {
      const href = source.url ? source.url : source.slug ? `/blog/${source.slug}` : undefined;
      return {
        ...source,
        href,
        isExternal: Boolean(source.url && !source.slug)
      };
    })
    .filter((source) => source.href || source.title);
  const hasSources = normalizedSources.length > 0;
  const hasMultipleSources = normalizedSources.length > 1;

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
      className={`flex ${isUser ? "justify-end" : "justify-start"
        }`}
    >
      <div className="chat-message-wrapper group">
        <div
          className={`rounded-lg p-2 chat-message-bubble ${isUser
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

          {/* Message content: assistant messages may contain generated widget blocks */}
          {message.content && (
            <div className="chat-message-content tiptap-content">
              {isUser ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                parseMessageSegments(message.content).map((segment, index) =>
                  segment.type === 'text' ? (
                    <ReactMarkdown key={index}>{segment.content}</ReactMarkdown>
                  ) : (
                    <WidgetPreviewCard key={index} widget={segment.widget} />
                  )
                )
              )}
            </div>
          )}

          {/* Show blog sources if present */}
          {hasSources && (
            <div className="flex flex-col gap-2 mt-2">
              {hasMultipleSources ? (
                <DropdownMenu
                  renderSwitcher={(props) => (
                    <span {...props}>
                      <Label theme="clear" size="m" className="cursor-pointer">
                        Sources +{sources.length}
                      </Label>
                    </span>
                  )}
                  popupProps={{ placement: 'bottom-start' }}
                >
                  <div style={{ padding: 8 }}>
                    <List
                      items={normalizedSources}
                      filterable={false}
                      sortable={false}
                      virtualized={false}
                      renderItem={(source) => (
                        <div style={{ padding: '4px 0' }}>
                          {source.href ? (
                            <Link
                              href={source.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              view="secondary"
                            >
                              {source.title}
                            </Link>
                          ) : (
                            <Text variant="body-2">{source.title}</Text>
                          )}
                          {source.snippet && (
                            <Text variant="caption-2" color="secondary" className="chat-source-snippet">
                              {source.snippet}
                            </Text>
                          )}
                        </div>
                      )}
                    />
                  </div>
                </DropdownMenu>
              ) : (
                <Label theme="clear" size="m">
                  Source:{" "}
                  {normalizedSources[0]?.href ? (
                    <Link
                      href={normalizedSources[0].href}
                      target="_blank"
                      rel="noopener noreferrer"
                      view="secondary"
                    >
                      {normalizedSources[0].title}
                    </Link>
                  ) : (
                    <Text variant="body-2">{normalizedSources[0]?.title}</Text>
                  )}
                </Label>
              )}
            </div>
          )}
        </div>

        {/* Copy button below message */}
        <ClipboardButton
          text={message.content}
          view="flat-secondary"
          size="s"
          className="chat-copy-button"
          onCopy={(text, result) => {
            if (result) {
              onCopy(text);
            }
          }}
          tooltipInitialText="Copy"
          tooltipSuccessText="Copied"
        />
      </div>
    </div>
  );
};
