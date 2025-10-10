"use client";

import { useEffect } from "react";
import { ChatList } from "./ChatList";
import { Button, Icon } from "@gravity-ui/uikit";
import { Bars, Xmark } from "@gravity-ui/icons";
import { useIsMobile } from "@/hooks/use-mobile";
import "./MobileChatSidebar.css";

interface MobileChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const MobileChatSidebar = ({ isOpen, onToggle, onClose }: MobileChatSidebarProps) => {
  const isMobile = useIsMobile();

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      onClose();
    }
  }, [isMobile, isOpen, onClose]);

  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div 
          className="mobile-sidebar-overlay fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`mobile-sidebar fixed top-0 left-0 h-full w-80 bg-background border-r z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="mobile-sidebar-header flex items-center justify-between p-4">
          <h2 className="text-lg font-semibold">Чаты</h2>
          <Button
            size="m"
            view="flat"
            onClick={onClose}
            title="Close menu"
          >
            <Icon data={Xmark} size={18} />
          </Button>
        </div>
        <div className="mobile-sidebar-content">
          <ChatList onChatSelect={onClose} />
        </div>
      </div>
    </>
  );
};

interface BurgerMenuButtonProps {
  onClick: () => void;
  isMenuOpen: boolean;
}

export const BurgerMenuButton = ({ onClick, isMenuOpen }: BurgerMenuButtonProps) => {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <Button
      className={`mobile-burger-btn fixed top-4 left-4 z-60 md:hidden transition-opacity duration-300 ${
        isMenuOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      size="l"
      view="outlined"
      onClick={handleClick}
      title="Open menu"
    >
      <Icon data={Bars} size={20} />
    </Button>
  );
};
