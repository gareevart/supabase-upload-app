"use client";

import { useToaster } from '@gravity-ui/uikit';

// Типы для совместимости с существующим кодом
type ToastVariant = 'default' | 'destructive' | 'success' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  action?: React.ReactNode;
  timeout?: number;
  /**
   * Управление автоскрытием тоста.
   * `true` — скрывать сразу, `false` — не скрывать,
   * число — задержка в миллисекундах.
   */
  autoHiding?: boolean | number;
}

export function useToast() {
  const toaster = useToaster();

  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', timeout = 5000 } = options;

    // Объединяем заголовок и описание в одно сообщение
    const content = title && description
      ? `${title}: ${description}`
      : title || description || '';

    // Определяем тему для тоста
    let theme: any = 'normal';
    switch (variant) {
      case 'destructive':
        theme = 'danger';
        break;
      case 'success':
        theme = 'success';
        break;
      case 'warning':
        theme = 'warning';
        break;
      case 'info':
        theme = 'info';
        break;
      default:
        theme = 'normal';
    }

    toaster.add({
      name: 'app-toast',
      title: content,
      theme: theme,
      autoHiding: timeout > 0 ? timeout : false,
    });
  };

  // Для совместимости с существующим кодом
  const dismiss = () => {
    // Gravity UI Toaster не требует явного закрытия тостов
    // Они автоматически закрываются по таймауту
  };

  return {
    toast,
    dismiss,
    toasts: [] // Пустой массив для совместимости
  };
}

// Экспортируем также как отдельную функцию для удобства
export const toast = (options: ToastOptions) => {
  // Создаем новый экземпляр тостера
  const toaster = (window as any).toaster;

  if (toaster) {
    const { title, description, variant = 'default', timeout = 5000 } = options;

    // Объединяем заголовок и описание в одно сообщение
    const content = title && description
      ? `${title}: ${description}`
      : title || description || '';

    // Определяем тему для тоста
    let theme: any = 'normal';
    switch (variant) {
      case 'destructive':
        theme = 'danger';
        break;
      case 'success':
        theme = 'success';
        break;
      case 'warning':
        theme = 'warning';
        break;
      case 'info':
        theme = 'info';
        break;
      default:
        theme = 'normal';
    }

    toaster.add({
      name: 'app-toast',
      title: content,
      theme: theme,
      autoHiding: timeout > 0 ? timeout : false,
    });
  } else {
    console.warn('Toaster not available');
  }
};
