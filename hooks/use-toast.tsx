"use client";

import React, { createContext, useContext, useRef } from 'react';
import { Toaster, ToasterComponent } from '@gravity-ui/uikit';

type ToastVariant = 'default' | 'destructive' | 'success' | 'info';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextType = {
  toast: (props: ToastProps) => void;
  dismiss: (toastId?: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toasterRef = useRef<Toaster>(new Toaster());

  const toast = ({ 
    title, 
    description, 
    variant = 'default',
    duration = 5000 
  }: ToastProps) => {
    // Create toast options based on our variant
    const options: Parameters<typeof toasterRef.current.add>[0] = {
      name: title || 'notification',
      title: title || '',
      content: description || '',
      autoHiding: duration > 0 ? duration : false,
    };

    // Set the notification type based on our variant
    if (variant === 'success') {
      options.theme = 'success';
    } else if (variant === 'destructive') {
      options.theme = 'danger';
    } else if (variant === 'info') {
      options.theme = 'info';
    }
    
    toasterRef.current.add(options);
  };

  const dismiss = (toastId?: string) => {
    if (toastId) {
      toasterRef.current.remove(toastId);
    } else {
      toasterRef.current.removeAll();
    }
  };

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToasterComponent />
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

// For direct usage without the hook
const toasterInstance = new Toaster();

export const toast = (props: ToastProps) => {
  const { 
    title, 
    description, 
    variant = 'default',
    duration = 5000 
  } = props;

  // Create toast options based on our variant
  const options: Parameters<typeof toasterInstance.add>[0] = {
    name: title || 'notification',
    title: title || '',
    content: description || '',
    autoHiding: duration > 0 ? duration : false,
  };

  // Set the notification type based on our variant
  if (variant === 'success') {
    options.theme = 'success';
  } else if (variant === 'destructive') {
    options.theme = 'danger';
  } else if (variant === 'info') {
    options.theme = 'info';
  }
  
  toasterInstance.add(options);
};
