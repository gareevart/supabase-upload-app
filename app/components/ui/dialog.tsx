import React from 'react';
import { Flex, Modal, Text } from '@gravity-ui/uikit';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
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
  return (
    <div className={`dialog-content ${className}`} style={{ padding: '24px', minWidth: '400px' }}>
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
