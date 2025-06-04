"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

// Metadata can't be exported from client components
// We'll rely on the root layout metadata instead

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // Add a small delay to ensure styles are loaded before showing content
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="auth-layout">
      {isLoading ? (
        <div className="auth-loading">Loading...</div>
      ) : (
        children
      )}
    </div>
  );
}
