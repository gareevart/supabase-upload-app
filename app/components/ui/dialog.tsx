import React from 'react';
import { Flex } from '@gravity-ui/uikit';

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = '' }) => {
  return (
    <Flex direction="row" justifyContent="flex-end" gap={2} className={`dialog-footer ${className}`}>
      {children}
    </Flex>
  );
};
