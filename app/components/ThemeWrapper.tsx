"use client";

import { ReactNode, useEffect, useMemo } from 'react';
import { ThemeProvider, ToasterProvider, ToasterComponent, Toaster } from '@gravity-ui/uikit';
// CSS import moved to root layout for better performance

interface ThemeWrapperProps {
  children: ReactNode;
  theme: "light" | "dark";
}

export default function ThemeWrapper({ children, theme }: ThemeWrapperProps) {
  // Create a new Toaster instance
  const toaster = useMemo(() => new Toaster(), []);
  
  // Make toaster globally available
  useEffect(() => {
    (window as any).toaster = toaster;
    return () => {
      delete (window as any).toaster;
    };
  }, [toaster]);
  
  return (
    <ThemeProvider theme={theme}>
      <ToasterProvider toaster={toaster}>
        <ToasterComponent className="optional additional classes" />
        {children}
      </ToasterProvider>
    </ThemeProvider>
  );
}
