'use client';

import React from 'react';
import { Flex, Text } from '@gravity-ui/uikit';
import './DrawerMenu.css';

type DrawerMenuProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
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
  bottomOffset = 65,
}: DrawerMenuProps) => {
  const titleId = React.useId();
  const style = {
    '--drawer-offset-bottom': `${bottomOffset}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`drawer-menu ${open ? 'open' : ''} ${className}`}
      style={style}
    >
      <div
        className={`drawer-content ${contentClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {title && (
          <Text variant="subheader-3" className="drawer-title" id={titleId}>
            {title}
          </Text>
        )}
        <div className="drawer-body">{children}</div>
        {footer && (
          <Flex direction="row" justifyContent="flex-end" gap={2} className="drawer-footer">
            {footer}
          </Flex>
        )}
      </div>
      <div className="drawer-overlay" onClick={onClose} />
    </div>
  );
};
