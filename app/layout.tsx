"use client";

import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from '@vercel/analytics/next';
import { SWRConfig } from 'swr';
import ThemeWrapper from './components/ThemeWrapper';
import Navigation from './components/Navigation/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ModelSelectionProvider } from './contexts/ModelSelectionContext';
import { I18nProvider } from './contexts/I18nContext';
import { SpeedInsights } from "@vercel/speed-insights/next"
import "@/styles/globals.css";
import '@/styles/styles.css';
import '@gravity-ui/aikit/styles';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // Ensure text remains visible during font loading
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap', // Ensure text remains visible during font loading
});

const queryClient = new QueryClient();

const themeBootstrapScript = `
(function () {
  var storedTheme = localStorage.getItem('app-theme');
  var resolvedTheme =
    storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

  var root = document.documentElement;
  root.classList.remove('g-root_theme_light', 'g-root_theme_dark');
  root.classList.add(resolvedTheme === 'dark' ? 'g-root_theme_dark' : 'g-root_theme_light');
  root.style.colorScheme = resolvedTheme;

  // Paint the browser chrome (Safari address bar, etc.) with the side-navigation
  // background before first paint. These mirror --g-color-base-float-announcement;
  // the effect in the layout refines them to the exact resolved token afterwards.
  var navColor = resolvedTheme === 'dark' ? 'rgb(67, 63, 67)' : 'rgb(240, 243, 245)';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', navColor);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize theme synchronously to avoid light-theme flash before effects run
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === 'undefined') {
      return 'light';
    }

    const savedTheme = window.localStorage.getItem('app-theme');

    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Detect theme preference and listen for changes
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      let systemThemeListener: ((e: MediaQueryListEvent) => void) | null = null;
      let mediaQuery: MediaQueryList | null = null;

      const initializeTheme = () => {
        // First check if there's a saved theme preference in localStorage
        const savedTheme = localStorage.getItem('app-theme');

        // Clean up any existing system theme listener
        if (systemThemeListener && mediaQuery) {
          mediaQuery.removeEventListener('change', systemThemeListener);
          systemThemeListener = null;
          mediaQuery = null;
        }

        if (savedTheme === 'light' || savedTheme === 'dark') {
          // Use saved theme preference
          setTheme(savedTheme);
        } else if (savedTheme === 'system' || !savedTheme) {
          // Use system preference if theme is set to 'system' or no theme is saved
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          setTheme(mediaQuery.matches ? 'dark' : 'light');

          // Add listener for system theme changes
          systemThemeListener = (e: MediaQueryListEvent) => {
            setTheme(e.matches ? 'dark' : 'light');
          };

          mediaQuery.addEventListener('change', systemThemeListener);
        }
      };

      // Initialize theme on mount
      initializeTheme();

      // Listen for storage events (theme changes from other components)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'app-theme') {
          // Clean up existing system theme listener
          if (systemThemeListener && mediaQuery) {
            mediaQuery.removeEventListener('change', systemThemeListener);
            systemThemeListener = null;
            mediaQuery = null;
          }

          if (e.newValue === 'light' || e.newValue === 'dark') {
            setTheme(e.newValue);
          } else if (e.newValue === 'system') {
            // If theme is set to system, use system preference
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setTheme(mediaQuery.matches ? 'dark' : 'light');

            // Add listener for system theme changes
            systemThemeListener = (event: MediaQueryListEvent) => {
              setTheme(event.matches ? 'dark' : 'light');
            };

            mediaQuery.addEventListener('change', systemThemeListener);
          }
        }
      };

      // Add event listener for storage changes
      window.addEventListener('storage', handleStorageChange);

      // Also listen for custom theme-change events
      const handleCustomThemeChange = (e: CustomEvent) => {
        const { theme } = e.detail;

        // Clean up existing system theme listener
        if (systemThemeListener && mediaQuery) {
          mediaQuery.removeEventListener('change', systemThemeListener);
          systemThemeListener = null;
          mediaQuery = null;
        }

        if (theme === 'light' || theme === 'dark') {
          setTheme(theme);
        } else if (theme === 'system') {
          // If theme is set to system, use system preference
          mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          setTheme(mediaQuery.matches ? 'dark' : 'light');

          // Add listener for system theme changes
          systemThemeListener = (event: MediaQueryListEvent) => {
            setTheme(event.matches ? 'dark' : 'light');
          };

          mediaQuery.addEventListener('change', systemThemeListener);
        }
      };

      window.addEventListener('theme-change', handleCustomThemeChange as EventListener);

      // Clean up event listeners on component unmount
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('theme-change', handleCustomThemeChange as EventListener);
        if (systemThemeListener && mediaQuery) {
          mediaQuery.removeEventListener('change', systemThemeListener);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.classList.remove('g-root_theme_light', 'g-root_theme_dark');
    root.classList.add(theme === 'dark' ? 'g-root_theme_dark' : 'g-root_theme_light');
    root.style.colorScheme = theme;
  }, [theme]);

  // Sync the theme-color meta with the actual resolved side-navigation background
  // so the browser chrome matches the sidebar — including when the in-app theme is
  // toggled (which is independent of prefers-color-scheme). Runs after the theme
  // class effect above, so the token resolves for the active theme. The meta is
  // updated imperatively (rather than via React) because dynamic <meta> updates in
  // the App Router head are unreliable and Safari reads the live attribute.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Hardcoded fallbacks mirror --g-color-base-float-announcement's solid value.
    let navColor = theme === 'dark' ? 'rgb(67, 63, 67)' : 'rgb(240, 243, 245)';

    // A probe element is used because getComputedStyle on a custom property may
    // return the unresolved var() chain, whereas a standard property
    // (background-color) always yields a concrete rgb() value. It is positioned
    // off-screen (not display:none) so the color actually resolves.
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;background-color:var(--g-color-base-float-announcement);';
    document.body.appendChild(probe);
    const resolved = window.getComputedStyle(probe).backgroundColor;
    probe.remove();

    if (resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent') {
      navColor = resolved;
    }

    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', navColor);
  }, [theme]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <SWRConfig
            value={{
              // Глобальные настройки кэширования для SWR
              dedupingInterval: 5 * 60 * 1000, // 5 минут дедупликации
              revalidateOnFocus: false, // Отключаем ревалидацию при фокусе
              revalidateOnReconnect: false, // Отключаем ревалидацию при восстановлении соединения
              errorRetryCount: 3, // Количество повторных попыток при ошибке
              errorRetryInterval: 1000, // Интервал между попытками
              // Провайдер для кэширования в localStorage (опционально)
              provider: () => new Map(),
            }}
          >
            <AuthProvider>
              <ModelSelectionProvider>
                <I18nProvider>
                  <ThemeWrapper theme={theme}>
                  <Navigation />
                  <main className="main-content py-6">
                    {children}
                    <Analytics />
                    <SpeedInsights />
                  </main>
                  </ThemeWrapper>
                </I18nProvider>
              </ModelSelectionProvider>
            </AuthProvider>
          </SWRConfig>
        </QueryClientProvider>
      </body>
    </html>
  );
}
