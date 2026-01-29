import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useChats, Chat } from "@/hooks/useChats";
import { useCreateChat } from "@/hooks/useCreateChat";
import { Button, Skeleton, Text, Icon, TextArea, List, DropdownMenu, Dialog } from "@gravity-ui/uikit";
import { Plus, Pencil, TrashBin, Xmark, Check } from '@gravity-ui/icons';
import "./ChatList.css";
import { useIsMobile } from "@/hooks/use-mobile";
import { DrawerMenu } from "@/shared/ui/DrawerMenu";

interface ChatListProps {
  onChatSelect?: () => void;
}

export const ChatList = ({ onChatSelect }: ChatListProps = {}) => {
  const isMobile = useIsMobile();
  const router = useRouter();
  const {
    chats,
    isLoading,
    error,
    updateChatTitle,
    deleteChat,
  } = useChats();
  const pathname = usePathname();
  // Debug active state removed
  const { handleCreateChat, createChat } = useCreateChat();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  /* pathname already declared above */

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

  const handleDeleteChat = async (chatId: string, e?: React.MouseEvent | KeyboardEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteChat = async () => {
    if (!chatToDelete) {
      setDeleteDialogOpen(false);
      return;
    }

    try {
      await deleteChat.mutateAsync(chatToDelete);
      onChatSelect?.();
    } finally {
      setDeleteDialogOpen(false);
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
        <List
          className="chat-list-gravity"
          items={chats}
          filterable={false}
          virtualized={false}
          renderItem={(chat: Chat) => {
            const isEditing = editingChatId === chat.id;
            const isActive = pathname?.includes(chat.id);

            if (isEditing) {
              return (
                <div className={`flex items-center gap-2 p-2 border rounded-md list-item-editing ${isActive ? "active" : ""}`}>
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
              );
            }

            return (
              <div
                className={`p-3 rounded-md list-item relative ${isActive ? "active" : ""}`}
                style={{
                  overflow: 'hidden',
                }}
              >
                {/* Navigation Overlay - Z-index 10 */}
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={() => {
                    router.push(`/chat/${chat.id}`);
                    onChatSelect?.();
                  }}
                />

                <div className="flex-1 min-w-0 mr-2 z-0" style={{ flex: '1 1 0%', minWidth: 0 }}>
                  <div className="font-medium truncate text-left w-full">{chat.title}</div>
                </div>

                {/* Dropdown Wrapper - Z-index 20 (Higher than Overlay) */}
                <div className="shrink-0 relative z-20" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu
                    size="s"
                    items={[
                      {
                        action: () => startEditing(chat.id, chat.title),
                        text: 'Переименовать',
                        iconStart: <Icon data={Pencil} size={16} />,
                      },
                      {
                        action: (e) => handleDeleteChat(chat.id, e),
                        text: 'Удалить',
                        iconStart: <Icon data={TrashBin} size={16} />,
                        theme: 'danger',
                      },
                    ]}
                  />
                </div>
              </div>
            );
          }}
        />
      )}

      {isMobile ? (
        <DrawerMenu
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          title="Удаление чата"
          footer={
            <>
              <Button view="outlined" size="l" onClick={() => setDeleteDialogOpen(false)}>
                Отмена
              </Button>
              <Button
                view="outlined-danger"
                size="l"
                onClick={confirmDeleteChat}
              >
                Удалить
              </Button>
            </>
          }
        >
          <Text variant="body-1">
            Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.
          </Text>
        </DrawerMenu>
      ) : (
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          aria-labelledby="delete-dialog-title"
        >
          <Dialog.Header caption="Удаление чата" id="delete-dialog-title" />
          <Dialog.Body>Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.</Dialog.Body>
          <Dialog.Footer
            onClickButtonCancel={() => setDeleteDialogOpen(false)}
            onClickButtonApply={confirmDeleteChat}
            textButtonApply="Удалить"
            textButtonCancel="Отмена"
            propsButtonApply={{ view: 'outlined-danger' }}
          />
        </Dialog>
      )}
    </div>
  );
};
