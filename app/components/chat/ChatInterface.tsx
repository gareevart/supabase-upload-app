
import { useState, useRef, useEffect } from "react";
import { useChat, Message } from "@/hooks/useChat";
import { Button,TextArea  } from "@gravity-ui/uikit";
import { Loader2, Send } from "lucide-react";
import { ScrollArea } from "@/app/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import {Toaster, Spin, Icon, Modal,Text } from '@gravity-ui/uikit';
import {Gear, Copy} from '@gravity-ui/icons';

interface ChatInterfaceProps {
  chatId: string;
}

export const ChatInterface = ({ chatId }: ChatInterfaceProps) => {
  const {
    chat,
    messages,
    isLoading,
    error,
    sendMessage,
    updateSystemPrompt,
    isMessageSending,
    isAssistantTyping,
  } = useChat(chatId);
  
  const toaster = new Toaster();
  const [messageText, setMessageText] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (chat?.system_prompt) {
      setSystemPrompt(chat.system_prompt);
    }
  }, [chat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageText.trim() || isMessageSending) return;
    
    const message = messageText;
    setMessageText("");
    
    try {
      await sendMessage.mutateAsync(message);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessageText(message); // Restore message if failed
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSaveSettings = async () => {
    await updateSystemPrompt.mutateAsync(systemPrompt);
    setIsSettingsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Произошла ошибка при загрузке чата. Пожалуйста, попробуйте позже.
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="text-center p-4">
        Чат не найден или был удален.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="border-b p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">{chat.title}</h2>
          {chat.tokens_used && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center">
              <Badge variant="outline" className="text-xs">
                Использовано токенов: {chat.tokens_used}
              </Badge>
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          size="m" 
          onClick={() => setOpen(true)}
          title="Настройки"
        >
           <Icon data={Gear} size={18} />
        </Button>
      </header>

      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">Начните общение с ассистентом</p>
              <p className="text-sm">Задайте вопрос или опишите, что вам нужно.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id} 
                message={message} 
                onCopy={(content) => {
                  navigator.clipboard.writeText(content);
                  toaster.add({
                    name: 'copy-notification',
                    title: 'Скопировано в буфер обмена',
                    autoHiding: 3000,
                  });
                }}
              />
            ))}
            {isAssistantTyping && (
              <div className="flex items-center gap-2 py-2 px-4 bg-muted rounded-lg w-fit">
                <div className="text-sm">Ассистент печатает</div>
                <Loader2 className="h-3 w-3 animate-spin" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t p-4 flex items-end gap-2"
      >
        <TextArea
          ref={textareaRef}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите ваше сообщение..."
          className="min-h-[60px] max-h-[200px] flex-1 resize-none"
        />
        <Button
          type="submit"
          size="m"
          disabled={!messageText.trim() || isMessageSending}
        >
          {isMessageSending ? (

            <Spin className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      <Modal className="modal" open={open} onClose={() => setOpen(false)}>
        <Text variant="header-1">Настройки чата</Text>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Системный промпт (роль ассистента)
              </div>
              <TextArea
                placeholder="Опишите, как должен вести себя ассистент, например: Ты полезный ассистент. Отвечай на вопросы пользователя чётко и лаконично."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Системный промпт определяет роль и поведение ассистента в этом чате.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
            size="l"
              view="outlined" 
              onClick={() => setIsSettingsOpen(false)}
            >
              Отмена
            </Button>
            <Button 
              view="action"
              size="l" onClick={handleSaveSettings}>
              Сохранить
            </Button>
          </DialogFooter>
      </Modal>    
    </div>
  );
};

interface ChatMessageProps {
  message: Message;
  onCopy: (content: string) => void;
}

const ChatMessage = ({ message, onCopy }: ChatMessageProps) => {
  const isUser = message.role === "user";
  
  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`rounded-lg py-2 px-4 max-w-[80%] relative group ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <div className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <Button 
          variant="ghost" 
          size="m" 
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onCopy(message.content)}
        >
          <Icon data={Copy} size={18} />
        </Button>
      </div>
    </div>
  );
};
