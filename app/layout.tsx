import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import ClientProviders from './components/ClientProviders';
import '@/styles/globals.css';
import '@/styles/styles.css';
import '@gravity-ui/aikit/styles';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Gareev',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const themeBootstrapScript = `
(function () {
  var storedTheme = localStorage.getItem('app-theme');
  var resolvedTheme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var root = document.documentElement;
  root.classList.remove('g-root_theme_light', 'g-root_theme_dark');
  root.classList.add(resolvedTheme === 'dark' ? 'g-root_theme_dark' : 'g-root_theme_light');
  root.style.colorScheme = resolvedTheme;
  var isDesktop = window.matchMedia('(min-width: 768px)').matches;
  var navColor = isDesktop ? (resolvedTheme === 'dark' ? 'rgb(67, 63, 67)' : 'rgb(240, 243, 245)') : (resolvedTheme === 'dark' ? 'rgb(16, 16, 16)' : 'rgb(255, 255, 255)');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); document.head.appendChild(meta); }
  meta.setAttribute('content', navColor);
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
