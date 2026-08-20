"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatContainer, ActionButton } from "@gravity-ui/aikit";
import type { ChatType, TChatMessage, TSubmitData } from "@gravity-ui/aikit";
import { Button, Breadcrumbs, Dialog, DropdownMenu, Icon, Select, Text, TextArea } from "@gravity-ui/uikit";
import { ActionBar } from "@gravity-ui/navigation";
import { Bulb, Circles3Plus, ClockArrowRotateLeft, Ellipsis, Magnifier, Plus, Sliders, TrashBin } from "@gravity-ui/icons";
import { useChat } from "@/hooks/useChat";
import { useChats } from "@/hooks/useChats";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { useI18n } from "@/app/contexts/I18nContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMenu } from "@/shared/ui/DrawerMenu";
import { FileUploader, FileAttachment } from "@/app/components/chat/FileUploader";
import { toAikitMessages, toAikitChats, toChatStatus } from "../model/adapters";
import { widgetMessageRegistry } from "./WidgetMessagePart";
import "./AikitChatPanel.css";

export function AikitChatPanel({ chatId }: { chatId: string }) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useI18n();

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
  const [useWidgetMode, setUseWidgetMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    setSystemPrompt(chat?.system_prompt ?? "");
  }, [chat?.system_prompt]);

  const aikitMessages = toAikitMessages(messages);
  const aikitChats = toAikitChats(chats);
  const activeChat = chat
    ? { id: chat.id, name: chat.title || t('chatView.breadcrumbNewChat'), createTime: chat.created_at }
    : null;
  const chatTitle = activeChat?.name || t('chatView.breadcrumbNewChat');
  const status = toChatStatus(isMessageSending, isAssistantTyping, !!error);

  const handleSendMessage = useCallback(
    async (data: TSubmitData) => {
      await sendMessage.mutateAsync({
        content: data.content,
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
        useWebSearch,
        useWidgetMode,
      });
      setAttachedFiles([]);
    },
    [sendMessage, attachedFiles, useWebSearch, useWidgetMode],
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

  const handleDeleteCurrentChat = async () => {
    try {
      await deleteChat.mutateAsync(chatId);
      setDeleteDialogOpen(false);
      router.push("/chat/history");
    } catch {
      // Error toast is handled in useChats
    }
  };

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
      <ActionButton
        size="m"
        view={useWidgetMode ? "action" : "flat"}
        onClick={() => setUseWidgetMode((v) => !v)}
        tooltipTitle={useWidgetMode ? t('chatForm.widgetModeOn') : t('chatForm.widgetModeOff')}
      >
        <Icon data={Circles3Plus} size={16} />
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
            { value: "ollama", content: "Ollama Cloud — qwen3:8b" },
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
      <div className="aikit-chat-panel__actionbar">
        <ActionBar aria-label={t('chatView.chatActions')}>
          <ActionBar.Section style={{ columnGap: 20, gap: 20 }}>
            <ActionBar.Group stretchContainer style={{ minWidth: 0 }}>
              <ActionBar.Item style={{ minWidth: 0, width: '100%' }}>
                <Breadcrumbs
                  className="aikit-chat-panel__breadcrumbs"
                  maxItems={3}
                >
                  <Breadcrumbs.Item href="/">
                    {t('chatView.breadcrumbHome')}
                  </Breadcrumbs.Item>
                  <Breadcrumbs.Item href="/chat/history">
                    {t('chatView.breadcrumbChat')}
                  </Breadcrumbs.Item>
                  <Breadcrumbs.Item href={`/chat/${chatId}`}>
                    {chatTitle}
                  </Breadcrumbs.Item>
                </Breadcrumbs>
              </ActionBar.Item>
            </ActionBar.Group>

            <ActionBar.Group pull="right">
              <ActionBar.Item>
                <Button
                  view="flat"
                  onClick={handleCreateChat}
                  loading={createChat.isPending}
                  title={t('chatView.newChatTooltip')}
                >
                  <Icon data={Plus} size={16} />
                </Button>
              </ActionBar.Item>
              <ActionBar.Item>
                <DropdownMenu
                  items={[
                    {
                      text: t('chatView.chatHistory'),
                      iconStart: <Icon data={ClockArrowRotateLeft} size={16} />,
                      action: () => router.push('/chat/history'),
                    },
                    {
                      text: t('chatView.deleteChat'),
                      theme: 'danger',
                      iconStart: <Icon data={TrashBin} size={16} />,
                      action: () => setDeleteDialogOpen(true),
                    },
                  ]}
                  switcher={
                    <Button view="flat" size="s" title={t('chatView.chatActions')}>
                      <Icon data={Ellipsis} size={16} />
                    </Button>
                  }
                />
              </ActionBar.Item>
            </ActionBar.Group>
          </ActionBar.Section>
        </ActionBar>
      </div>

      <div className="aikit-chat-panel__body-shell">
      <ChatContainer
        chats={aikitChats}
        activeChat={activeChat}
        // ChatContainer is not generic over custom message content; the
        // 'widget' parts are handled by widgetMessageRegistry at render time
        messages={aikitMessages as unknown as TChatMessage[]}
        status={status}
        onSendMessage={handleSendMessage}
        onSelectChat={handleSelectChat}
        onCreateChat={handleCreateChat}
        onDeleteChat={handleDeleteChat}
        showNewChat={false}
        showHistory={false}
        headerProps={{ showTitle: false }}
        shouldParseIncompleteMarkdown
        showActionsOnHover
        messageListConfig={{ messageRendererRegistry: widgetMessageRegistry }}
        promptInputProps={{
          view: "full",
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
      </div>

      {isMobile ? (
        <DrawerMenu
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title={t('chatView.deleteTitle')}
          footer={
            <>
              <Button view="outlined" size="l" onClick={() => setDeleteDialogOpen(false)}>
                {t('chatView.cancel')}
              </Button>
              <Button
                view="outlined-danger"
                size="l"
                onClick={handleDeleteCurrentChat}
                loading={deleteChat.isPending}
              >
                {t('chatView.deleteConfirm')}
              </Button>
            </>
          }
        >
          <Text variant="body-1">{t('chatView.deleteText')}</Text>
        </DrawerMenu>
      ) : (
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <Dialog.Header caption={t('chatView.deleteTitle')} />
          <Dialog.Body>{t('chatView.deleteText')}</Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setDeleteDialogOpen(false)}
            onClickButtonApply={handleDeleteCurrentChat}
            textButtonApply={t('chatView.deleteConfirm')}
            textButtonCancel={t('chatView.cancel')}
            propsButtonApply={{ view: 'outlined-danger', loading: deleteChat.isPending }}
          />
        </Dialog>
      )}

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
