'use client';

import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { Flex, Sheet } from '@gravity-ui/uikit';
import { useSheetPointerDrag } from './useSheetPointerDrag';
import { useSheetTabBarAnchor } from './useSheetTabBarAnchor';
import './DrawerMenu.css';

type DrawerMenuProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Оставить место для bottom tab bar; overlay под навигацией (z-index) */
  reserveTabBar?: boolean;
  bottomOffset?: number;
};

export const DrawerMenu = ({
  open,
  onClose,
  title,
  children,
  footer,
  className = '',
  contentClassName = '',
  reserveTabBar = false,
  bottomOffset,
}: DrawerMenuProps) => {
  const sheetId = useId();
  const sheetDomId = sheetId.replace(/:/g, '');
  const sheetSelector = `.drawer-menu-sheet--${sheetDomId}`;
  const anchoredAboveTabBar = reserveTabBar || (bottomOffset ?? 0) > 0;
  const [mounted, setMounted] = useState(false);

  useSheetPointerDrag(open, sheetSelector, onClose);
  useSheetTabBarAnchor(open, sheetSelector, anchoredAboveTabBar);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || bottomOffset === undefined) {
      return;
    }

    let sheetRoot: HTMLElement | null = null;
    let frameId = 0;

    const applyOffset = () => {
      sheetRoot = document.querySelector(sheetSelector);
      if (!sheetRoot) {
        return false;
      }
      sheetRoot.style.setProperty('--drawer-offset-bottom', `${bottomOffset}px`);
      return true;
    };

    if (!applyOffset()) {
      frameId = window.requestAnimationFrame(applyOffset);
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      sheetRoot?.style.removeProperty('--drawer-offset-bottom');
    };
  }, [open, bottomOffset, sheetSelector]);

  if (!mounted) {
    return null;
  }

  return (
    <Sheet
      id={sheetDomId}
      visible={open}
      onClose={onClose}
      title={title}
      className={`drawer-menu-sheet drawer-menu-sheet--${sheetDomId} ${anchoredAboveTabBar ? 'drawer-menu-sheet--above-tab-bar' : ''} ${className}`.trim()}
      contentClassName={contentClassName}
    >
      <div className="drawer-menu-sheet__body">{children}</div>
      {footer && (
        <Flex direction="row" justifyContent="flex-end" gap={2} className="drawer-menu-sheet__footer">
          {footer}
        </Flex>
      )}
    </Sheet>
  );
};