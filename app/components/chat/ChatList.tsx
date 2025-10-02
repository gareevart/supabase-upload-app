import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { useCreateChat } from "@/hooks/useCreateChat";
import { Button, Skeleton, Text, Icon, TextArea } from "@gravity-ui/uikit";
import {Plus, Pencil, TrashBin, Xmark, Check } from '@gravity-ui/icons';
import "./ChatList.css";

interface ChatListProps {
  onChatSelect?: () => void;
}

export const ChatList = ({ onChatSelect }: ChatListProps = {}) => {
  const {
    chats,
    isLoading,
    error,
    updateChatTitle,
    deleteChat,
  } = useChats();
  const { handleCreateChat, createChat } = useCreateChat();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const pathname = usePathname();

  const startEditing = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setNewTitle(currentTitle);
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setNewTitle("");
  };

  const saveTitle = async (chatId: string) => {
    if (!newTitle.trim()) return;
    await updateChatTitle.mutateAsync({ id: chatId, title: newTitle.trim() });
    setEditingChatId(null);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Вы уверены, что хотите удалить этот чат?")) {
      await deleteChat.mutateAsync(chatId);
      // Навигация будет обработана автоматически через useChats
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-4">
          <Text variant="header-1">Чаты</Text>
          <Skeleton className="h-9 w-9" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500">
        Ошибка при загрузке чатов. Пожалуйста, попробуйте позже.
      </div>
    );
  }

  return (
    <div className="chat-list-mobile">
      <div className="flex justify-between items-center mb-4">
        <Text variant="header-1">Чаты</Text>
        <Button
          size="m"
          onClick={handleCreateChat}
          loading={createChat.isPending}
          title="Создать новый чат"
        >
          <Icon data={Plus} size={16} />
        </Button>
      </div>
      
      {chats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">У вас пока нет чатов</p>
          <Button onClick={handleCreateChat} loading={createChat.isPending}>
            <Icon data={Plus} size={16} />
            Создать чат
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              {editingChatId === chat.id ? (
                <div className={`flex items-center gap-2 p-2 border rounded-md list ${pathname === `/chat/${chat.id}` ? "active" : ""}`}>
                  <TextArea
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название чата"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="m"
                    view="flat"
                    onClick={() => saveTitle(chat.id)}
                    loading={updateChatTitle.isPending}
                  >
                    <Icon data={Check} size={16} />
                  </Button>
                  <Button size="m" view="flat" onClick={cancelEditing}>
                    <Icon data={Xmark} size={16} />
                  </Button>
                </div>
              ) : (
                <Link
                  href={`/chat/${chat.id}`}
                  className={`flex items-center justify-between p-3 rounded-md list ${pathname === `/chat/${chat.id}` ? "active" : ""}`}
                  onClick={() => onChatSelect?.()}
                >
                  <div className="w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="flex items-center space-x-1 ml-2 shrink-0">
                        <Button
                          size="m"
                          view="flat-secondary"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditing(chat.id, chat.title);
                          }}
                        >
                          <Icon data={Pencil} size={16} />
                        </Button>
                        <Button
                          size="m"
                          view="flat-danger"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                          <Icon data={TrashBin} size={16} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
