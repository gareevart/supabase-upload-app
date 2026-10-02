"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChatContainer } from "@gravity-ui/aikit";
import type { TChatMessage, TSubmitData } from "@gravity-ui/aikit";
import { Breadcrumbs, Button, Dialog, Spin, Text } from "@gravity-ui/uikit";
import { useI18n } from "@/app/contexts/I18nContext";
import type { Message } from "@/hooks/useChat";
import "./AikitChatPanel.css";

const STORAGE_KEY = "guest-chat-v1";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  useEffect(() => {
    setMessages(readMessages());
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
  }, [messages, sending, t]);

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
          <Button onClick={() => setRegisterOpen(true)}>{t("chatView.breadcrumbNewChat")}</Button>
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
    </div>
  );
}
