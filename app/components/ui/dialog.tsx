'use client';

import React from 'react';
import { Flex, Modal, Text } from '@gravity-ui/uikit';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { useIsMobile } from '@/hooks/use-mobile';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerMenu open={open} onClose={() => onOpenChange(false)}>
        {children}
      </DrawerMenu>
    );
  }

  return (
    <Modal open={open} onClose={() => onOpenChange(false)}>
      {children}
    </Modal>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({ children, className = '' }) => {
  const isMobile = useIsMobile();
  const style = isMobile ? { padding: '24px' } : { padding: '24px', minWidth: '400px' };

  return (
    <div className={`dialog-content ${className}`} style={style}>
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`dialog-header ${className}`} style={{ marginBottom: '16px' }}>
      {children}
    </div>
  );
};

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children, className = '' }) => {
  return (
    <Text variant="header-2" className={`dialog-title ${className}`}>
      {children}
    </Text>
  );
};

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => {
  return (
    <Flex direction="row" justifyContent="flex-end" gap={2} className={`dialog-footer ${className}`} style={{ marginTop: '16px' }}>
      {children}
    </Flex>
  );
};
