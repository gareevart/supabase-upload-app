"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChatSidebarContextType {
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

const ChatSidebarContext = createContext<ChatSidebarContextType | undefined>(undefined);

export const ChatSidebarProvider = ({ children }: { children: ReactNode }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <ChatSidebarContext.Provider value={{ isMobileSidebarOpen, toggleSidebar, closeSidebar }}>
      {children}
    </ChatSidebarContext.Provider>
  );
};

export const useChatSidebar = () => {
  const context = useContext(ChatSidebarContext);
  if (context === undefined) {
    throw new Error("useChatSidebar must be used within a ChatSidebarProvider");
  }
  return context;
};

