import { Geist, Geist_Mono } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from '@vercel/analytics/next';
import { SWRConfig } from 'swr';
import ThemeWrapper from './components/ThemeWrapper';
import Navigation from './components/Navigation/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { ModelSelectionProvider } from './contexts/ModelSelectionContext';
import { SpeedInsights } from "@vercel/speed-insights/next"
import "@/styles/globals.css";
import '@/styles/styles.css';
import ClientThemeProvider from './components/ClientThemeProvider';

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
              dedupingInterval: 5 * 60 * 1000,
              revalidateOnFocus: false,
              revalidateOnReconnect: false,
              errorRetryCount: 3,
              errorRetryInterval: 1000,
              provider: () => new Map(),
            }}
          >
            <AuthProvider>
              <ModelSelectionProvider>
                <ClientThemeProvider>
                  <Navigation />
                  <main className="main-content py-6">
                    {children}
                    <Analytics />
                    <SpeedInsights />
                  </main>
                </ClientThemeProvider>
              </ModelSelectionProvider>
            </AuthProvider>
          </SWRConfig>
        </QueryClientProvider>
      </body>
    </html>
  );
}
