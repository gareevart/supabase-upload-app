"use client";

import { useState, useEffect, ReactNode } from "react";
import ThemeWrapper from './ThemeWrapper';

export default function ClientThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;
    let mediaQuery: MediaQueryList | null = null;

    const initializeTheme = () => {
      const savedTheme = localStorage.getItem('app-theme');

      if (systemThemeListener && mediaQuery) {
        mediaQuery.removeEventListener('change', systemThemeListener);
        systemThemeListener = null;
        mediaQuery = null;
      }

      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      } else if (savedTheme === 'system' || !savedTheme) {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        systemThemeListener = (e: MediaQueryListEvent) => {
          setTheme(e.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', systemThemeListener);
      }
    };

    initializeTheme();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'app-theme') {
        if (systemThemeListener && mediaQuery) {
          mediaQuery.removeEventListener('change', systemThemeListener);
          systemThemeListener = null;
          mediaQuery = null;
        }

        if (e.newValue === 'light' || e.newValue === 'dark') {
          setTheme(e.newValue);
        } else if (e.newValue === 'system') {
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          setTheme(mediaQuery.matches ? 'dark' : 'light');

          systemThemeListener = (event: MediaQueryListEvent) => {
            setTheme(event.matches ? 'dark' : 'light');
          };

          mediaQuery.addEventListener('change', systemThemeListener);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const handleCustomThemeChange = (e: CustomEvent) => {
      const { theme } = e.detail;

      if (systemThemeListener && mediaQuery) {
        mediaQuery.removeEventListener('change', systemThemeListener);
        systemThemeListener = null;
        mediaQuery = null;
      }

      if (theme === 'light' || theme === 'dark') {
        setTheme(theme);
      } else if (theme === 'system') {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');

        systemThemeListener = (event: MediaQueryListEvent) => {
          setTheme(event.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', systemThemeListener);
      }
    };

    window.addEventListener('theme-change', handleCustomThemeChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleCustomThemeChange as EventListener);
      if (systemThemeListener && mediaQuery) {
        mediaQuery.removeEventListener('change', systemThemeListener);
      }
    };
  }, []);

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted) {
    return <ThemeWrapper theme="light">{children}</ThemeWrapper>;
  }

  return <ThemeWrapper theme={theme}>{children}</ThemeWrapper>;
}
