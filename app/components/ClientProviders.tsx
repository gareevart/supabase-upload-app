'use client';

import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SWRConfig } from 'swr';
import ThemeWrapper from './ThemeWrapper';
import Navigation from './Navigation/Navigation';
import { AuthProvider } from '../contexts/AuthContext';
import { ModelSelectionProvider } from '../contexts/ModelSelectionContext';
import { I18nProvider } from '../contexts/I18nContext';

const queryClient = new QueryClient();

type Theme = 'light' | 'dark';
type PageDirection = 'left' | 'right';

const mobileNavigationOrder = ['/', '/blog', '/projects', '/search', '/auth/profile'];

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const savedTheme = window.localStorage.getItem('app-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function ThemeManager({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    let mediaQuery: MediaQueryList | null = null;
    let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;

    const applyTheme = (nextTheme: string | null) => {
      if (systemThemeListener && mediaQuery) {
        mediaQuery.removeEventListener('change', systemThemeListener);
        systemThemeListener = null;
        mediaQuery = null;
      }

      if (nextTheme === 'light' || nextTheme === 'dark') {
        setTheme(nextTheme);
        return;
      }

      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setTheme(mediaQuery.matches ? 'dark' : 'light');
      systemThemeListener = (event) => setTheme(event.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', systemThemeListener);
    };

    applyTheme(window.localStorage.getItem('app-theme'));

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'app-theme') applyTheme(event.newValue);
    };
    const handleCustomThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      applyTheme(theme ?? null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleCustomThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleCustomThemeChange);
      if (systemThemeListener && mediaQuery) {
        mediaQuery.removeEventListener('change', systemThemeListener);
      }
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('g-root_theme_light', 'g-root_theme_dark');
    root.classList.add(theme === 'dark' ? 'g-root_theme_dark' : 'g-root_theme_light');
    root.style.colorScheme = theme;

    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const applyThemeColor = () => {
      const token = desktopQuery.matches ? '--g-color-base-float-announcement' : '--g-color-base-background';
      let color = desktopQuery.matches
        ? (theme === 'dark' ? 'rgb(67, 63, 67)' : 'rgb(240, 243, 245)')
        : (theme === 'dark' ? 'rgb(16, 16, 16)' : 'rgb(255, 255, 255)');
      const probe = document.createElement('div');
      probe.style.cssText = `position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;background-color:var(${token});`;
      document.body.appendChild(probe);
      const resolved = window.getComputedStyle(probe).backgroundColor;
      probe.remove();
      if (resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent') color = resolved;

      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', color);
    };

    applyThemeColor();
    desktopQuery.addEventListener('change', applyThemeColor);
    return () => desktopQuery.removeEventListener('change', applyThemeColor);
  }, [theme]);

  return <ThemeWrapper theme={theme}>{children}</ThemeWrapper>;
}

function MobilePageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const previousPathnameRef = useRef(pathname);
  const [direction, setDirection] = useState<PageDirection>('right');
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (pathname === previousPathnameRef.current) return;

    const previousIndex = mobileNavigationOrder.indexOf(previousPathnameRef.current);
    const nextIndex = mobileNavigationOrder.indexOf(pathname);
    if (previousIndex !== -1 && nextIndex !== -1) {
      setDirection(nextIndex > previousIndex ? 'left' : 'right');
    }
    hasNavigatedRef.current = true;
    previousPathnameRef.current = pathname;
  }, [pathname]);

  return (
    <div
      key={pathname}
      className={hasNavigatedRef.current ? `mobile-page-transition mobile-page-transition--${direction}` : undefined}
    >
      {children}
    </div>
  );
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={{ dedupingInterval: 5 * 60 * 1000, revalidateOnFocus: false, revalidateOnReconnect: false, errorRetryCount: 3, errorRetryInterval: 1000, provider: () => new Map() }}>
        <AuthProvider>
          <ModelSelectionProvider>
            <I18nProvider>
              <ThemeManager>
                <Navigation />
                <main className="main-content py-6">
                  <MobilePageTransition>{children}</MobilePageTransition>
                  <Analytics />
                  <SpeedInsights />
                </main>
              </ThemeManager>
            </I18nProvider>
          </ModelSelectionProvider>
        </AuthProvider>
      </SWRConfig>
    </QueryClientProvider>
  );
}
