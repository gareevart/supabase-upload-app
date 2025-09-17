"use client";

import { useState, ReactNode } from "react";
import { ChatList } from "./ChatList";
import { MobileChatSidebar, BurgerMenuButton } from "./MobileChatSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import "./ChatLayout.css";

interface ChatLayoutProps {
  children: ReactNode;
}

export const ChatLayout = ({ children }: ChatLayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleToggleSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const handleCloseSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="chat-layout">
      {/* Mobile burger button */}
      <BurgerMenuButton 
        onClick={handleToggleSidebar} 
        isMenuOpen={isMobileSidebarOpen}
      />

      {/* Mobile sidebar */}
      <MobileChatSidebar
        isOpen={isMobileSidebarOpen}
        onToggle={handleToggleSidebar}
        onClose={handleCloseSidebar}
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
