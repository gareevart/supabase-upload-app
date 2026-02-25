"use client";

import { Xmark, Comment, ArrowRightFromSquare } from "@gravity-ui/icons";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, Spin, Text } from "@gravity-ui/uikit";
import { useAuth } from "@/app/contexts/AuthContext";
import { useChats } from "@/hooks/useChats";
import { ChatInterface } from "@/app/components/chat/ChatInterface";
import { ChatSidebarProvider } from "@/app/components/chat/ChatSidebarContext";
import "./ChatPanel.css";

type ChatPanelProps = {
  draggable?: boolean;
  zIndex?: number;
  onActivate?: () => void;
  onClose?: () => void;
  className?: string;
};

export function ChatPanel({ draggable = false, zIndex, onActivate, onClose, className }: ChatPanelProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { chats, isLoading: isChatsLoading, createChat } = useChats();
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(null);
  const isCreatingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const panelRef = useRef<HTMLElement>(null);

  // Center the panel on mount
  useEffect(() => {
    if (!draggable) return;

    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const nextX = Math.max(16, (window.innerWidth - panelRect.width) / 2);
    const nextY = Math.max(16, (window.innerHeight - panelRect.height) / 2);
    setPosition({ x: nextX, y: nextY });
  }, [draggable]);

  // Resolve the chat: use most recent or create a new one
  useEffect(() => {
    if (!user || isChatsLoading || resolvedChatId || isCreatingRef.current) return;

    if (chats && chats.length > 0) {
      setResolvedChatId(chats[0].id);
    } else {
      isCreatingRef.current = true;
      createChat.mutateAsync().then((newChat) => {
        if (newChat?.id) {
          setResolvedChatId(newChat.id);
        }
        isCreatingRef.current = false;
      }).catch(() => {
        isCreatingRef.current = false;
      });
    }
  }, [user, chats, isChatsLoading, resolvedChatId, createChat]);

  const handleWindowDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0) return;
    event.preventDefault();

    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const dragStartX = event.clientX;
    const dragStartY = event.clientY;
    const originX = position.x;
    const originY = position.y;
    const panelWidth = panelRect.width;
    const panelHeight = panelRect.height;

    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartX;
      const deltaY = moveEvent.clientY - dragStartY;
      const maxX = Math.max(16, window.innerWidth - panelWidth - 16);
      const maxY = Math.max(16, window.innerHeight - panelHeight - 16);
      const nextX = Math.min(maxX, Math.max(16, originX + deltaX));
      const nextY = Math.min(maxY, Math.max(16, originY + deltaY));
      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const isReady = !!user && !!resolvedChatId;

  return (
    <section
      ref={panelRef}
      className={`chat-panel ${draggable ? "chat-panel--floating" : ""} ${isDragging ? "chat-panel--dragging" : ""} ${className ?? ""}`}
      style={draggable ? { left: `${position.x}px`, top: `${position.y}px`, zIndex } : undefined}
      onPointerDownCapture={draggable ? onActivate : undefined}
      aria-label="Chat widget"
      role={draggable ? "dialog" : undefined}
      aria-modal={draggable ? "false" : undefined}
    >
      {draggable && (
        <div
          className="chat-panel__drag-zone"
          onPointerDown={handleWindowDragStart}
          aria-hidden="true"
        />
      )}

      <div
        className={`chat-panel__header ${draggable ? "chat-panel__header--draggable" : ""}`}
        onPointerDown={handleWindowDragStart}
      >
        <div className="chat-panel__header-title">
          <Text variant="subheader-2" className="flex items-center gap-2">
            <Icon data={Comment} size={16} />
            Chat
          </Text>
        </div>
        {onClose && (
          <Button
            size="s"
            view="outlined"
            aria-label="Close chat widget"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Icon data={Xmark} size={14} />
          </Button>
        )}
      </div>

      <div className="chat-panel__body">
        {authLoading ? (
          <div className="chat-panel__loading">
            <Spin size="s" />
          </div>
        ) : !user ? (
          <div className="chat-panel__auth-prompt">
            <Icon data={Comment} size={32} />
            <Text variant="subheader-2">Sign in to chat</Text>
            <Text variant="body-1" color="secondary">You need to be signed in to use the chat</Text>
            <Button
              view="action"
              size="l"
              onClick={() => {
                onClose?.();
                router.push('/auth');
              }}
            >
              <Icon data={ArrowRightFromSquare} size={16} />
              Sign in
            </Button>
          </div>
        ) : isReady ? (
          <ChatSidebarProvider>
            <ChatInterface chatId={resolvedChatId} />
          </ChatSidebarProvider>
        ) : (
          <div className="chat-panel__loading">
            <Spin size="s" />
            <Text variant="body-1" color="secondary">Loading chat...</Text>
          </div>
        )}
      </div>
    </section>
  );
}
