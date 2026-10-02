"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatContainer } from "@gravity-ui/aikit";
import type { TChatMessage, TSubmitData } from "@gravity-ui/aikit";
import { Breadcrumbs, Button, Dialog, Icon, Select, Spin, Text, TextArea } from "@gravity-ui/uikit";
import { Sliders } from "@gravity-ui/icons";
import { useI18n } from "@/app/contexts/I18nContext";
import { useModelSelection } from "@/app/contexts/ModelSelectionContext";
import type { Message } from "@/hooks/useChat";
import "./AikitChatPanel.css";

const STORAGE_KEY = "guest-chat-v1";
const SYSTEM_PROMPT_STORAGE_KEY = "guest-chat-system-prompt";
const GUEST_CHAT_ID = "guest";

function readMessages(): Message[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter((message): message is Message =>
      message && (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" && typeof message.id === "string" &&
      typeof message.created_at === "string"
    );
  } catch {
    return [];
  }
}

export function GuestChatPanel() {
  const { t } = useI18n();
  const { selectedModel, setSelectedModel, availableModels } = useModelSelection();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");

  useEffect(() => {
    setMessages(readMessages());
    setSystemPrompt(localStorage.getItem(SYSTEM_PROMPT_STORAGE_KEY) || "");
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [loaded, messages]);

  const sendMessage = useCallback(async (data: TSubmitData) => {
    const content = data.content?.trim();
    if (!content || sending) return;
    if (content.length > 4000) {
      setError(t("chatView.guestTooLong"));
      return;
    }
    setSending(true);
    setError(null);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: GUEST_CHAT_ID,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/guest-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].slice(-20).map((message) => ({
            role: message.role,
            text: message.content,
          })),
          model: selectedModel,
          systemPrompt,
        }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.text !== "string") throw new Error(result.error || "Request failed");

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: GUEST_CHAT_ID,
        role: "assistant",
        content: result.text,
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, userMessage, assistantMessage]);
    } catch (cause) {
      console.error("Guest chat failed:", cause);
      setError(t("chatView.guestError"));
    } finally {
      setSending(false);
    }
  }, [messages, selectedModel, sending, systemPrompt, t]);

  const saveSettings = () => {
    localStorage.setItem(SYSTEM_PROMPT_STORAGE_KEY, systemPrompt);
    setSettingsOpen(false);
  };

  if (!loaded) return <div className="chat-page-loading"><Spin size="m" /></div>;

  const chatTitle = t("chatView.guestTitle");
  return (
    <div className="aikit-chat-page">
      <div className="aikit-chat-panel">
        <div className="aikit-chat-panel__actionbar aikit-chat-panel__actionbar_guest">
          <Breadcrumbs className="aikit-chat-panel__breadcrumbs" maxItems={2}>
            <Breadcrumbs.Item href="/">{t("chatView.breadcrumbHome")}</Breadcrumbs.Item>
            <Breadcrumbs.Item href="/chat">{chatTitle}</Breadcrumbs.Item>
          </Breadcrumbs>
          <div className="aikit-chat-panel__guest-actions">
            <Button
              view="flat"
              onClick={() => setSettingsOpen(true)}
              title={t("chatView.settingsTooltip")}
            >
              <Icon data={Sliders} size={16} />
            </Button>
            <Button onClick={() => setRegisterOpen(true)}>{t("chatView.breadcrumbNewChat")}</Button>
          </div>
        </div>
        {error && <Text variant="body-1" color="danger">{error}</Text>}
        <div className="aikit-chat-panel__body-shell">
          <ChatContainer
            chats={[]}
            activeChat={{ id: GUEST_CHAT_ID, name: chatTitle, createTime: messages[0]?.created_at || new Date().toISOString() }}
            messages={messages.map((message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              timestamp: message.created_at,
            })) as TChatMessage[]}
            status={sending ? "submitted" : "ready"}
            onSendMessage={sendMessage}
            onCreateChat={() => setRegisterOpen(true)}
            showNewChat={false}
            showHistory={false}
            headerProps={{ showTitle: false }}
            shouldParseIncompleteMarkdown
            promptInputProps={{ bodyProps: { placeholder: t("chatView.messagePlaceholder"), minRows: 1, maxRows: 8 } }}
          />
        </div>
      </div>
      <Dialog open={registerOpen} onClose={() => setRegisterOpen(false)}>
        <Dialog.Header caption={t("chatView.guestRegisterTitle")} />
        <Dialog.Body>{t("chatView.guestRegisterText")}</Dialog.Body>
        <Dialog.Footer>
          <Button onClick={() => setRegisterOpen(false)}>{t("chatView.cancel")}</Button>
          <Link href="/auth/signup"><Button view="action">{t("chatView.guestRegisterAction")}</Button></Link>
        </Dialog.Footer>
      </Dialog>
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <Dialog.Header caption={t("chatView.settingsTitle")} />
        <Dialog.Body>
          <div className="aikit-chat-panel__settings">
            <div>
              <Text variant="body-1">{t("chatView.modelLabel")}</Text>
              <Text variant="body-2" color="secondary">{t("chatView.modelDescription")}</Text>
              <Select
                value={[selectedModel]}
                options={availableModels.map((model) => ({ value: model, content: model }))}
                onUpdate={(value) => { if (value[0]) setSelectedModel(value[0]); }}
                size="m"
                width="max"
              />
            </div>
            <div>
              <Text variant="body-1">{t("chatView.systemPromptLabel")}</Text>
              <Text variant="body-2" color="secondary">{t("chatView.systemPromptDescription")}</Text>
              <TextArea
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                rows={5}
                controlProps={{ maxLength: 4000 }}
                placeholder={t("chatView.systemPromptPlaceholder")}
              />
            </div>
          </div>
        </Dialog.Body>
        <Dialog.Footer
          onClickButtonCancel={() => setSettingsOpen(false)}
          onClickButtonApply={saveSettings}
          textButtonApply={t("chatView.save")}
          textButtonCancel={t("chatView.cancel")}
        />
      </Dialog>
    </div>
  );
}
