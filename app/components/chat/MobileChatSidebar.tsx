"use client";

import { useEffect } from "react";
import { ChatList } from "./ChatList";
import { Button, Icon, Text } from "@gravity-ui/uikit";
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
      {isOpen && (
        <div
          className="mobile-sidebar-overlay"
          onClick={onClose}
        />
      )}

      <div className={`mobile-sidebar ${isOpen ? "mobile-sidebar_open" : ""}`}>
        <div className="mobile-sidebar-header">
          <Text variant="subheader-2">Чаты</Text>
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
      className={`mobile-burger-btn ${isMenuOpen ? "mobile-burger-btn_hidden" : ""}`}
      size="l"
      view="outlined"
      onClick={handleClick}
      title="Open menu"
    >
      <Icon data={Bars} size={20} />
    </Button>
  );
};
