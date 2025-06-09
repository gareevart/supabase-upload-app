"use client";

import React, { createContext, useContext, useState } from 'react';

type ToastOptions = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
};

interface Toast extends ToastOptions {
  id: string;
}

type ToastContextType = {
  toast: (props: ToastOptions) => void;
  dismiss: (toastId?: string) => void;
  toasts: Toast[];
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (options: ToastOptions) => {
    const toastId = crypto.randomUUID();
    setToasts(prev => [...prev, { ...options, id: toastId }]);
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      setToasts(prev => prev.filter(t => t.id !== toastId));
    } else {
      setToasts([]);
    }
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

export const toast = (options: ToastOptions) => {
  const context = useContext(ToastContext);
  
  if (context) {
    context.toast(options);
  } else {
    console.warn('Toast used outside of ToastProvider');
  }
};
