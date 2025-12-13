"use client";

import { ReactNode } from "react";
import { ChatList } from "./ChatList";
import { MobileChatSidebar } from "./MobileChatSidebar";
import { ChatSidebarProvider, useChatSidebar } from "./ChatSidebarContext";
import "./ChatLayout.css";

interface ChatLayoutProps {
  children: ReactNode;
}

const ChatLayoutContent = ({ children }: ChatLayoutProps) => {
  const { isMobileSidebarOpen, toggleSidebar, closeSidebar } = useChatSidebar();

  return (
    <div className="chat-layout">
      {/* Mobile sidebar */}
      <MobileChatSidebar
        isOpen={isMobileSidebarOpen}
        onToggle={toggleSidebar}
        onClose={closeSidebar}
      />

      <div className="chat-layout-container">
        {/* Desktop sidebar */}
        <aside className="chat-sidebar desktop-only">
          <div className="chat-sidebar-content">
            <ChatList />
          </div>
        </aside>

        {/* Main chat area */}
        <main className="chat-main">
          <div className="chat-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export const ChatLayout = ({ children }: ChatLayoutProps) => {
  return (
    <ChatSidebarProvider>
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </ChatSidebarProvider>
  );
};
