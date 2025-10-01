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
import { SpeedInsights } from "@vercel/speed-insights/next"
import '@gravity-ui/uikit/styles/styles.css';
import "@/styles/globals.css";
import '@/styles/styles.css';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize with a default, but we'll update it based on saved preference or system preference
  const [theme, setTheme] = useState<"light" | "dark">("light");

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
  
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <meta name="theme-color" content="#1D4634" />
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
                <ThemeWrapper theme={theme}>
                  <Navigation />
                  <main className="main-content">
                    {children}
                    <Analytics/>
                    <SpeedInsights/>
                  </main>
                </ThemeWrapper>
              </ModelSelectionProvider>
            </AuthProvider>
          </SWRConfig>
        </QueryClientProvider>
      </body>
    </html>
  );
}
