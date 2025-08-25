import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

let toastCounter = 0;

const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
      const id = (++toastCounter).toString();
      const newToast: Toast = {
        id,
        title,
        description,
        variant,
        duration,
      };

      setState((prevState) => ({
        toasts: [...prevState.toasts, newToast],
      }));

      // Auto-remove toast after duration
      if (duration > 0) {
        setTimeout(() => {
          setState((prevState) => ({
            toasts: prevState.toasts.filter((t) => t.id !== id),
          }));
        }, duration);
      }

      return id;
    },
    []
  );

  const dismiss = useCallback((toastId: string) => {
    setState((prevState) => ({
      toasts: prevState.toasts.filter((t) => t.id !== toastId),
    }));
  }, []);

  const dismissAll = useCallback(() => {
    setState({ toasts: [] });
  }, []);

  return {
    toast,
    dismiss,
    dismissAll,
    toasts: state.toasts,
  };
};

export { useToast };