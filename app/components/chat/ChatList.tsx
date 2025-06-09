
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useChats } from "@/hooks/useChats";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Pencil,
  Trash,
  MessageSquarePlus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Skeleton } from "@gravity-ui/uikit";
import { 
  Select, 
  SelectTrigger, 
  SelectValue, 
  SelectContent, 
  SelectItem 
} from "@/app/components/ui/select";
import { useModelSelection } from "@/hooks/useModelSelection";

export const ChatList = () => {
  const router = useRouter();
  const {
    chats,
    isLoading,
    error,
    createChat,
    updateChatTitle,
    deleteChat,
  } = useChats();
  const { selectedModel, setSelectedModel } = useModelSelection();
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const handleCreateChat = async () => {
    try {
      const result = await createChat.mutateAsync();
      if (result && result.id) {
        router.push(`/chat/${result.id}`);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

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
      router.push("/chat");
    }
  };

  const handleModelChange = (value: string) => {
    setSelectedModel(value as "yandexgpt" | "deepseek");
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Чаты</h2>
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
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Чаты</h2>
        <div className="flex space-x-2">
          <Select 
            value={selectedModel} 
            onValueChange={handleModelChange}
          >
            <SelectTrigger className="w-[120px]" title="Выбрать модель">
              <SelectValue placeholder="Модель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yandexgpt">YandexGPT</SelectItem>
              <SelectItem value="deepseek">Deepseek R1</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            onClick={handleCreateChat}
            disabled={createChat.isPending}
            title="Создать новый чат"
          >
            {createChat.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {chats.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">У вас пока нет чатов</p>
          <Button onClick={handleCreateChat} disabled={createChat.isPending}>
            {createChat.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="mr-2 h-4 w-4" />
            )}
            Создать чат
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              {editingChatId === chat.id ? (
                <div className="flex items-center gap-2 p-2 border rounded-md">
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Название чата"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => saveTitle(chat.id)}
                    disabled={updateChatTitle.isPending}
                  >
                    {updateChatTitle.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Link
                  href={`/chat/${chat.id}`}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted"
                >
                  <div className="w-full overflow-hidden">
                    <div className="flex justify-between items-center">
                      <div className="font-medium truncate">{chat.title}</div>
                      <div className="flex items-center space-x-1 ml-2 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditing(chat.id, chat.title);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                        >
                          <Trash className="h-4 w-4" />
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
