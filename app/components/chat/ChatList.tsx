import { useMemo, useState } from "react";
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
  showTitle?: boolean;
  showCreateButton?: boolean;
}

export const ChatList = ({
  onChatSelect,
  showTitle = true,
  showCreateButton = true,
}: ChatListProps = {}) => {
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
  const { handleCreateChat, createChat } = useCreateChat();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const selectedItemIndex = useMemo(() => {
    const index = chats.findIndex((chat) => pathname?.includes(chat.id));
    return index >= 0 ? index : undefined;
  }, [chats, pathname]);

  const listItems = useMemo(
    () =>
      chats.map((chat) => ({
        ...chat,
        disabled: editingChatId === chat.id,
      })),
    [chats, editingChatId],
  );

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

  const handleItemClick = (chat: Chat) => {
    if (editingChatId === chat.id) {
      return;
    }

    router.push(`/chat/${chat.id}`);
    onChatSelect?.();
  };

  const stopItemClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  if (isLoading) {
    return (
      <div className="chat-list__loading">
        {(showTitle || showCreateButton) && (
          <div
            className={[
              "chat-list__header",
              !showTitle && showCreateButton ? "chat-list__header_actions-only" : "",
            ].filter(Boolean).join(" ")}
          >
            {showTitle ? <Text variant="header-1">Чаты</Text> : <span />}
            {showCreateButton ? <Skeleton className="chat-list__skeleton-button" /> : null}
          </div>
        )}
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="chat-list__skeleton-item" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Text variant="body-1" color="danger" className="chat-list__error">
        Ошибка при загрузке чатов. Пожалуйста, попробуйте позже.
      </Text>
    );
  }

  return (
    <div className="chat-list">
      {(showTitle || showCreateButton) && (
        <div className="chat-list__header">
          {showTitle ? <Text variant="header-1">Чаты</Text> : <span />}
          {showCreateButton ? (
            <Button
              size="m"
              onClick={handleCreateChat}
              loading={createChat.isPending}
              title="Создать новый чат"
            >
              <Icon data={Plus} size={16} />
            </Button>
          ) : null}
        </div>
      )}

      {chats.length === 0 ? (
        <div className="chat-list__empty">
          <Text variant="body-1" color="secondary" className="chat-list__empty-text">
            У вас пока нет чатов
          </Text>
          <Button onClick={handleCreateChat} loading={createChat.isPending}>
            <Icon data={Plus} size={16} />
            Создать чат
          </Button>
        </div>
      ) : (
        <List
          className="chat-list__gravity-list"
          items={listItems}
          filterable={false}
          virtualized={false}
          size="l"
          selectedItemIndex={selectedItemIndex}
          onItemClick={(chat) => handleItemClick(chat)}
          renderItem={(chat: Chat) => {
            const isEditing = editingChatId === chat.id;

            if (isEditing) {
              return (
                <div
                  className="chat-list__item-editing"
                  onClick={stopItemClick}
                  onMouseDown={stopItemClick}
                >
                  <TextArea
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название чата"
                    className="chat-list__item-editing-field"
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
              <div className="chat-list__item-row">
                <Text variant="body-1" className="chat-list__item-title">
                  {chat.title}
                </Text>
                <div
                  className="chat-list__item-menu"
                  onClick={stopItemClick}
                  onMouseDown={stopItemClick}
                >
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
