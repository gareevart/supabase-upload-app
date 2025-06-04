"use client";

import { ReactNode, useEffect, useState } from 'react';
import { ThemeProvider, ToasterProvider, ToasterComponent, Toaster } from '@gravity-ui/uikit';
// CSS import moved to root layout for better performance

interface ThemeWrapperProps {
  children: ReactNode;
}

export default function ThemeWrapper({ children, theme }: ThemeWrapperProps & { theme: "light" | "dark" }) {
  // Create a new Toaster instance
  const toaster = new Toaster();
  
  // Add state to track if component is mounted (client-side)
  const [mounted, setMounted] = useState(false);
  
  // Only show UI after first client-side render to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <ToasterProvider toaster={toaster}>
        <ToasterComponent className="optional additional classes" />
        {mounted ? children : null}
      </ToasterProvider>
    </ThemeProvider>
  );
}
