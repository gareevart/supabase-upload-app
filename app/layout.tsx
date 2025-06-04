"use client";

import { useState, useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeWrapper from './components/ThemeWrapper';
import { Toaster } from './components/ui/toast';
import "./globals.css";
import Navigation from './components/Navigation/Navigation';
import '@gravity-ui/uikit/styles/styles.css';
import './auth/Auth.css';


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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize with a default, but we'll update it based on system preference
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Detect system theme preference and listen for changes
  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      // Check if user prefers dark mode
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      // Set initial theme based on system preference
      setIsDarkTheme(mediaQuery.matches);
      
      // Add listener for theme changes
      const handleThemeChange = (e: MediaQueryListEvent) => {
        setIsDarkTheme(e.matches);
      };
      
      // Add event listener
      mediaQuery.addEventListener('change', handleThemeChange);
      
      // Clean up event listener on component unmount
      return () => {
        mediaQuery.removeEventListener('change', handleThemeChange);
      };
    }
  }, []);

  // Allow manual theme toggling
  const toggleTheme = (newTheme: boolean) => {
    setIsDarkTheme(newTheme);
  };
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeWrapper theme={isDarkTheme ? "dark" : "light"}>
          <Toaster>
            <Navigation />
            <main className="main-content">
              {children}
            </main>
          </Toaster>
        </ThemeWrapper>
      </body>
    </html>
  );
}
