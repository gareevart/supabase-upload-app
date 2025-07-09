"use client";

import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from '@vercel/analytics/next';
import ThemeWrapper from './components/ThemeWrapper';
import { ToastProvider } from '@/hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import Navigation from './components/Navigation/Navigation';
import { AuthProvider } from './contexts/AuthContext';
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
      // First check if there's a saved theme preference in localStorage
      const savedTheme = localStorage.getItem('app-theme');
      
      if (savedTheme === 'light' || savedTheme === 'dark') {
        // Use saved theme preference
        setTheme(savedTheme);
      } else if (savedTheme === 'system') {
        // Use system preference if theme is set to 'system'
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
        
        // Add listener for system theme changes
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
          setTheme(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
      } else {
        // Fallback to system preference if no saved theme
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setTheme(mediaQuery.matches ? 'dark' : 'light');
        
        // Add listener for system theme changes
        const handleSystemThemeChange = (e: MediaQueryListEvent) => {
          setTheme(e.matches ? 'dark' : 'light');
        };
        
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => {
          mediaQuery.removeEventListener('change', handleSystemThemeChange);
        };
      }
      
      // Listen for storage events (theme changes from other components)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'app-theme') {
          if (e.newValue === 'light' || e.newValue === 'dark') {
            setTheme(e.newValue);
          } else if (e.newValue === 'system') {
            // If theme is set to system, use system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setTheme(mediaQuery.matches ? 'dark' : 'light');
          }
        }
      };
      
      // Add event listener for storage changes
      window.addEventListener('storage', handleStorageChange);
      
      // Also listen for custom storage events dispatched within the same window
      const handleCustomStorageEvent = (e: Event) => {
        const storageEvent = e as StorageEvent;
        if (storageEvent.key === 'app-theme') {
          if (storageEvent.newValue === 'light' || storageEvent.newValue === 'dark') {
            setTheme(storageEvent.newValue);
          } else if (storageEvent.newValue === 'system') {
            // If theme is set to system, use system preference
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            setTheme(mediaQuery.matches ? 'dark' : 'light');
          }
        }
      };
      
      window.addEventListener('storage', handleCustomStorageEvent);
      
      // Clean up event listeners on component unmount
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('storage', handleCustomStorageEvent);
      };
    }
  }, []);
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeWrapper theme={theme}>
              <ToastProvider>
                <Toaster />
                <Navigation />
                <main className="main-content">
                  {children}
                  <Analytics/>
                  <SpeedInsights/>
                </main>
              </ToastProvider>
            </ThemeWrapper>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
