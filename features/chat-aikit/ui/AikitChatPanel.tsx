"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatContainer, ActionButton } from "@gravity-ui/aikit";
import type { ChatType, TSubmitData } from "@gravity-ui/aikit";
import { Button, Dialog, Icon, Select, Text, TextArea } from "@gravity-ui/uikit";
import { Bulb, Magnifier, Sliders } from "@gravity-ui/icons";
import { useChat } from "@/hooks/useChat";
import { useChats } from "@/hooks/useChats";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMenu } from "@/shared/ui/DrawerMenu";
import { FileUploader, FileAttachment } from "@/app/components/chat/FileUploader";
import { toAikitMessages, toAikitChats, toChatStatus } from "../model/adapters";
import "./AikitChatPanel.css";

export function AikitChatPanel({ chatId }: { chatId: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();

  const {
    chat,
    messages,
    sendMessage,
    updateSystemPrompt,
    isMessageSending,
    isAssistantTyping,
    error,
  } = useChat(chatId);
  const { chats, createChat, deleteChat } = useChats();
  const { reasoningMode, setReasoningMode, selectedModel, setSelectedModel } = useModelSelection();

  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    setSystemPrompt(chat?.system_prompt ?? "");
  }, [chat?.system_prompt]);

  const aikitMessages = toAikitMessages(messages);
  const aikitChats = toAikitChats(chats);
  const activeChat = chat
    ? { id: chat.id, name: chat.title || "Новый чат", createTime: chat.created_at }
    : null;
  const status = toChatStatus(isMessageSending, isAssistantTyping, !!error);

  const handleSendMessage = useCallback(
    async (data: TSubmitData) => {
      await sendMessage.mutateAsync({
        content: data.content,
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
        useWebSearch,
      });
      setAttachedFiles([]);
    },
    [sendMessage, attachedFiles, useWebSearch],
  );

  const handleSelectChat = useCallback(
    (c: ChatType) => router.push(`/chat/${c.id}`),
    [router],
  );

  const handleCreateChat = useCallback(async () => {
    const newChat = await createChat.mutateAsync();
    if (newChat?.id) router.push(`/chat/${newChat.id}`);
  }, [createChat, router]);

  const handleDeleteChat = useCallback(
    async (c: ChatType) => {
      deleteChat.mutate(c.id);
    },
    [deleteChat],
  );

  const handleSaveSettings = async () => {
    await updateSystemPrompt.mutateAsync(systemPrompt);
    setSettingsOpen(false);
  };

  const footerTools = (
    <div className="aikit-chat-panel__tools">
      <FileUploader
        files={attachedFiles}
        onFilesChange={setAttachedFiles}
        disabled={isMessageSending}
        compact
        buttonView="flat"
        tooltipTitle="Прикрепить файл"
        maxFiles={3}
        maxFileSize={10 * 1024 * 1024}
      />
      <ActionButton
        size="m"
        view={useWebSearch ? "action" : "flat"}
        onClick={() => setUseWebSearch((v) => !v)}
        tooltipTitle={useWebSearch ? "Отключить веб-поиск" : "Включить веб-поиск"}
      >
        <Icon data={Magnifier} size={16} />
      </ActionButton>
      {selectedModel === "yandexgpt" && (
        <ActionButton
          size="m"
          view={reasoningMode ? "action" : "flat"}
          onClick={() => setReasoningMode(!reasoningMode)}
          tooltipTitle={reasoningMode ? "Отключить режим рассуждений" : "Включить режим рассуждений"}
        >
          <Icon data={Bulb} size={16} />
        </ActionButton>
      )}
      <ActionButton
        size="m"
        view="flat"
        onClick={() => setSettingsOpen(true)}
        tooltipTitle="Настройки чата"
      >
        <Icon data={Sliders} size={16} />
      </ActionButton>
    </div>
  );

  const settingsContent = (
    <div className="aikit-chat-panel__settings">
      <div>
        <Text variant="body-1">Модель ИИ</Text>
        <Text variant="body-2" color="secondary">Будет применена только для этого чата</Text>
        <Select
          value={[selectedModel]}
          options={[
            { value: "yandexgpt", content: "YandexGPT" },
            { value: "yandexgpt-lite", content: "YandexGPT Lite" },
            { value: "deepseek", content: "Deepseek R1" },
            { value: "aliceai-llm", content: "Alice AI LLM" },
          ]}
          onUpdate={(value) => {
            if (value[0]) setSelectedModel(value[0] as Parameters<typeof setSelectedModel>[0]);
          }}
          size="m"
          width="max"
        />
      </div>
      <div>
        <Text variant="body-1">Системный промпт</Text>
        <Text variant="body-2" color="secondary">Определяет роль и поведение ассистента в этом чате</Text>
        <TextArea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          placeholder="Ты полезный ассистент. Отвечай чётко и лаконично."
        />
      </div>
    </div>
  );

  return (
    <div className="aikit-chat-panel">
      <ChatContainer
        chats={aikitChats}
        activeChat={activeChat}
        messages={aikitMessages}
        status={status}
        onSendMessage={handleSendMessage}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        shouldParseIncompleteMarkdown
        showActionsOnHover
        promptInputProps={{
          topPanel:
            attachedFiles.length > 0
              ? {
                  isOpen: true,
                  children: (
                    <FileUploader
                      files={attachedFiles}
                      onFilesChange={setAttachedFiles}
                      disabled={isMessageSending}
                      maxFiles={3}
                      maxFileSize={10 * 1024 * 1024}
                    />
                  ),
                }
              : { isOpen: false },
          footerProps: {
            bottomContent: footerTools,
          },
          bodyProps: {
            placeholder: "Напишите сообщение...",
            minRows: 1,
            maxRows: 8,
          },
        }}
        i18nConfig={{
          header: {
            defaultTitle: "Чат",
            newChatTooltip: "Новый чат",
            historyTooltip: "История чатов",
          },
          history: {
            emptyPlaceholder: "Нет чатов",
            emptyFilteredPlaceholder: "Ничего не найдено",
            searchPlaceholder: "Поиск чатов...",
          },
        }}
      />

      {isMobile ? (
        <DrawerMenu
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title="Настройки чата"
          footer={
            <>
              <Button view="outlined" size="l" onClick={() => setSettingsOpen(false)}>
                Отмена
              </Button>
              <Button view="action" size="l" onClick={handleSaveSettings}>
                Сохранить
              </Button>
            </>
          }
        >
          {settingsContent}
        </DrawerMenu>
      ) : (
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <Dialog.Header caption="Настройки чата" />
          <Dialog.Body>{settingsContent}</Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setSettingsOpen(false)}
            onClickButtonApply={handleSaveSettings}
            textButtonApply="Сохранить"
            textButtonCancel="Отмена"
          />
        </Dialog>
      )}
    </div>
  );
}
