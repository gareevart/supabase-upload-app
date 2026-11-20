"use client";

import { useState, useCallback, useEffect, useId, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatContainer, ActionButton, ContextIndicator } from "@gravity-ui/aikit";
import type { ChatType, TChatMessage, TSubmitData } from "@gravity-ui/aikit";
import { Button, Dialog, DropdownMenu, Icon, Select, Text, TextArea } from "@gravity-ui/uikit";
import { PageActionBar } from "@/shared/ui/PageActionBar";
import { Circles3Plus, ClockArrowRotateLeft, Ellipsis, Plus, Sliders, TrashBin } from "@gravity-ui/icons";
import { useChat } from "@/hooks/useChat";
import { useChats } from "@/hooks/useChats";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import { useI18n } from "@/app/contexts/I18nContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMenu } from "@/shared/ui/DrawerMenu";
import { FileUploader, FileAttachment } from "@/app/components/chat/FileUploader";
import { getModelContextLength } from "@/lib/chatModels";
import { toAikitMessages, toAikitChats, toChatStatus } from "../model/adapters";
import { getContextUsage } from "../model/contextUsage";
import { widgetMessageRegistry } from "./WidgetMessagePart";
import "./AikitChatPanel.css";

export function AikitChatPanel({ chatId }: { chatId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt")?.trim();
  const initialPromptHandledRef = useRef(false);
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
  const { selectedModel, setSelectedModel, availableModels } = useModelSelection();

  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
  const [useWidgetMode, setUseWidgetMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteDialogTitleId = useId();
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
  const breadcrumbChatTitle = chatTitle.length > 100 ? `${chatTitle.slice(0, 97)}...` : chatTitle;
  const status = toChatStatus(isMessageSending, isAssistantTyping, !!error);
  const contextUsage = getContextUsage(messages);
  const contextMaxTokens = getModelContextLength(selectedModel);
  const contextUsageText = [
    `${t('chatView.contextUsage')}: ${contextUsage.tokens.toLocaleString()} / ${contextMaxTokens.toLocaleString()}`,
    contextUsage.isEstimate ? `(${t('chatView.contextUsageEstimate')})` : null,
  ].filter(Boolean).join(' ');

  const handleSendMessage = useCallback(
    async (data: TSubmitData) => {
      await sendMessage.mutateAsync({
        content: data.content,
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
        useWidgetMode,
      });
      setAttachedFiles([]);
    },
    [sendMessage, attachedFiles, useWidgetMode],
  );

  useEffect(() => {
    if (!chat || !initialPrompt || initialPromptHandledRef.current) return;

    initialPromptHandledRef.current = true;
    void handleSendMessage({ content: initialPrompt } as TSubmitData).then(() => {
      router.replace(`/chat/${chatId}`, { scroll: false });
    });
  }, [chat, chatId, handleSendMessage, initialPrompt, router]);

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
        tooltipTitle={t('chatView.attachFile')}
        maxFiles={3}
        maxFileSize={10 * 1024 * 1024}
      />
      <ActionButton
        size="m"
        view={useWidgetMode ? "action" : "flat"}
        onClick={() => setUseWidgetMode((v) => !v)}
        tooltipTitle={useWidgetMode ? t('chatForm.widgetModeOn') : t('chatForm.widgetModeOff')}
      >
        <Icon data={Circles3Plus} size={16} />
      </ActionButton>
      <ActionButton
        size="m"
        view="flat"
        onClick={() => setSettingsOpen(true)}
        tooltipTitle={t('chatView.settingsTooltip')}
      >
        <Icon data={Sliders} size={16} />
      </ActionButton>
      <ContextIndicator
        className="aikit-chat-panel__context"
        type="number"
        usedContext={contextUsage.tokens}
        maxContext={contextMaxTokens}
        tooltipContent={contextUsageText}
      />
    </div>
  );

  const settingsContent = (
    <div className="aikit-chat-panel__settings">
      <div>
        <Text variant="body-1">{t('chatView.modelLabel')}</Text>
        <Text variant="body-2" color="secondary">{t('chatView.modelDescription')}</Text>
        <Select
          value={[selectedModel]}
          options={[
            ...availableModels.map((model) => ({ value: model, content: model })),
          ]}
          onUpdate={(value) => {
            if (value[0]) setSelectedModel(value[0] as Parameters<typeof setSelectedModel>[0]);
          }}
          size="m"
          width="max"
        />
      </div>
      <div>
        <Text variant="body-1">{t('chatView.systemPromptLabel')}</Text>
        <Text variant="body-2" color="secondary">{t('chatView.systemPromptDescription')}</Text>
        <TextArea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          placeholder={t('chatView.systemPromptPlaceholder')}
        />
      </div>
    </div>
  );

  return (
    <div className="aikit-chat-panel">
      <PageActionBar
        ariaLabel={t('chatView.chatActions')}
        items={[
          { label: t('gallery.breadcrumb.projects'), href: '/projects' },
          { label: t('chatView.breadcrumbChat'), href: '/chat/history' },
          { label: breadcrumbChatTitle, href: `/chat/${chatId}` },
        ]}
        actions={
          <>
            <Button
              view="flat"
              onClick={handleCreateChat}
              loading={createChat.isPending}
              title={t('chatView.newChatTooltip')}
            >
              <Icon data={Plus} size={16} />
            </Button>
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
          </>
        }
      />

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
            placeholder: t('chatView.messagePlaceholder'),
            minRows: 1,
            maxRows: 8,
          },
        }}
        i18nConfig={{
          header: {
            defaultTitle: t('chatView.defaultTitle'),
            newChatTooltip: t('chatView.newChatTooltip'),
            historyTooltip: t('chatView.historyTooltip'),
          },
          history: {
            emptyPlaceholder: t('chatView.emptyPlaceholder'),
            emptyFilteredPlaceholder: t('chatView.emptyFilteredPlaceholder'),
            searchPlaceholder: t('chatView.searchPlaceholder'),
          },
        }}
      />
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby={deleteDialogTitleId}
      >
        <Dialog.Header id={deleteDialogTitleId} caption={t('chatView.deleteTitle')} />
        <Dialog.Body>{t('chatView.deleteText')}</Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setDeleteDialogOpen(false)}
          onClickButtonApply={handleDeleteCurrentChat}
          textButtonApply={t('chatView.deleteConfirm')}
          textButtonCancel={t('chatView.cancel')}
          propsButtonApply={{ view: 'outlined-danger', loading: deleteChat.isPending }}
        />
      </Dialog>

      {isMobile ? (
        <DrawerMenu
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          title={t('chatView.settingsTooltip')}
          footer={
            <>
              <Button view="outlined" size="l" onClick={() => setSettingsOpen(false)}>
                {t('chatView.cancel')}
              </Button>
              <Button view="action" size="l" onClick={handleSaveSettings}>
                {t('chatView.save')}
              </Button>
            </>
          }
        >
          {settingsContent}
        </DrawerMenu>
      ) : (
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <Dialog.Header caption={t('chatView.settingsTitle')} />
          <Dialog.Body>{settingsContent}</Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setSettingsOpen(false)}
            onClickButtonApply={handleSaveSettings}
            textButtonApply={t('chatView.save')}
            textButtonCancel={t('chatView.cancel')}
          />
        </Dialog>
      )}
    </div>
  );
}
