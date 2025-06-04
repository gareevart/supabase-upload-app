"use client";

import { ToastProvider } from "@/hooks/use-toast";

export function Toaster({ children }: { children?: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}