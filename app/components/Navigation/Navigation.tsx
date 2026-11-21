import React, { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';

import { useRouter, usePathname } from 'next/navigation';
import { Icon, Button, Popover, Text } from '@gravity-ui/uikit';
import { House, Circles4Square, Person, Magnifier, BookOpen, Bars, Xmark, Circles3Plus, Calculator, Camera, Gear, ArrowLeft, Star } from '@gravity-ui/icons';
import { useFavorites } from '@/features/favorites/model/useFavorites';
import { getFavoriteKindIcon } from '@/entities/favorite/lib/favoriteKindIcon';
import type { FavoriteKind } from '@/entities/favorite/model/types';
import UserAvatar from '../UserAvatar';
import NavigationItem from './NavigationItem';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { CalculatorPanel } from '@/features/calculator/ui';
import { CameraPanel } from '@/features/camera/ui';
import { UserWidgetPanel } from '@/features/widget-runtime/ui/UserWidgetPanel';
import { CommandMenu, type CommandGroup } from '@/components/ui/command-menu-clean';
import { useEnabledWidgets } from '@/features/widget-list/model/useEnabledWidgets';
import { useWidgets } from '@/features/widget-list/model/useWidgets';
import {
  BUILTIN_WIDGETS_EVENT,
  BuiltinWidgetsState,
  getBuiltinWidgetsState,
} from '@/features/widget-list/lib/builtinWidgets';
import { useI18n } from '@/app/contexts/I18nContext';
import Link from 'next/link'
import './Navigation.css';
import { NAVIGATION_POSITION_EVENT, NAVIGATION_POSITION_STORAGE_KEY, NavigationPosition } from './navigationPosition';

type WidgetId = 'calculator' | 'camera';
type WidgetAnimationState = 'closed' | 'entering' | 'open' | 'exiting';

type EditorMenuState = {
  mode: 'blog' | 'broadcast';
  onSave: () => void | Promise<void>;
  onDraft: () => void | Promise<void>;
  onCancel: () => void;
};

type NavItem = {
  id: string;
  icon: typeof House;
  label: string;
  link: string;
  activePrefixes: readonly string[];
};

const allNavItems: NavItem[] = [
  { id: 'home', icon: House, label: 'Home', link: '/', activePrefixes: ['/'] },
  { id: 'blog', icon: BookOpen, label: 'Blog', link: '/blog', activePrefixes: ['/blog'] },
  {
    id: 'projects',
    icon: Circles4Square,
    label: 'Projects',
    link: '/projects',
    activePrefixes: ['/projects', '/chat'],
  },
  { id: 'search', icon: Magnifier, label: 'Search', link: '/search', activePrefixes: ['/search'] },
  { id: 'profile', icon: Person, label: 'Profile', link: '/auth/profile', activePrefixes: [] },
];

const matchesNavPrefix = (pathname: string, prefix: string) =>
  prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`);

const getActiveItemFromPath = (pathname: string): string =>
  allNavItems.find((item) => item.activePrefixes.some((prefix) => matchesNavPrefix(pathname, prefix)))?.id ?? '';

export const EDITOR_MENU_EVENT = 'editor-menu-change';

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { favorites } = useFavorites();
  const widgetsTriggerRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [blogSearchInput, setBlogSearchInput] = useState('');
  const [debouncedBlogQuery, setDebouncedBlogQuery] = useState('');
  const [isWidgetsPanelOpen, setIsWidgetsPanelOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedBlogQuery(blogSearchInput.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [blogSearchInput]);

  const { data: blogSearchResults = [] } = useSWR(
    debouncedBlogQuery.length >= 2 ? `/api/blog-posts/search?q=${encodeURIComponent(debouncedBlogQuery)}` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Blog search failed');
      const data = await response.json();
      return data.results as Array<{ id: string; title: string; excerpt: string | null; slug: string | null }>;
    },
  );
  const [calculatorWidgetState, setCalculatorWidgetState] = useState<WidgetAnimationState>('closed');
  const [cameraWidgetState, setCameraWidgetState] = useState<WidgetAnimationState>('closed');
  const [widgetLayers, setWidgetLayers] = useState<Record<WidgetId, number>>({
    calculator: 70,
    camera: 71,
  });
  const widgetLayerCounterRef = useRef(71);
  const { widgets: enabledUserWidgets } = useEnabledWidgets();
  const { widgets: ownedUserWidgets } = useWidgets('my');
  const searchableUserWidgets = useMemo(() => {
    const ownedWidgetIds = new Set(ownedUserWidgets.map((widget) => widget.id));
    return [
      ...ownedUserWidgets,
      ...enabledUserWidgets.filter((widget) => !ownedWidgetIds.has(widget.id)),
    ];
  }, [enabledUserWidgets, ownedUserWidgets]);
  const [builtinWidgets, setBuiltinWidgets] = useState<BuiltinWidgetsState>({
    calculator: true,
    camera: true,
  });
  const [userWidgetWindows, setUserWidgetWindows] = useState<Record<string, WidgetAnimationState>>({});
  const [userWidgetLayers, setUserWidgetLayers] = useState<Record<string, number>>({});
  const [widgetsPanelStyle, setWidgetsPanelStyle] = useState<React.CSSProperties>({});
  const [navigationPosition, setNavigationPosition] = useState<NavigationPosition>('left');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [editorMenu, setEditorMenu] = useState<EditorMenuState | null>(null);
  const isLeftAnchoredWidgetsPanel = navigationPosition === 'left' && !isMobileViewport;
  const isBottomAnchoredWidgetsPanel = navigationPosition === 'bottom' || isMobileViewport;
  const isChatRoute = pathname?.startsWith('/chat') ?? false;

  // Update active item when pathname changes
  useEffect(() => {
    const handleEditorMenuChange = (event: Event) => {
      const customEvent = event as CustomEvent<EditorMenuState | null>;
      setEditorMenu(customEvent.detail ?? null);
    };

    window.addEventListener(EDITOR_MENU_EVENT, handleEditorMenuChange);
    return () => window.removeEventListener(EDITOR_MENU_EVENT, handleEditorMenuChange);
  }, []);

  useEffect(() => {
    const activeFromPath = getActiveItemFromPath(pathname || '');
    setActiveItem(activeFromPath);
    localStorage.setItem('activeItem', activeFromPath);
    setIsWidgetsPanelOpen(false);
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const applyNavigationPosition = (value: string | null) => {
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      const resolvedPosition: NavigationPosition = isMobile || value === 'bottom' ? 'bottom' : 'left';
      setNavigationPosition(resolvedPosition);
      document.body.classList.toggle('navigation-position-bottom', resolvedPosition === 'bottom');
      document.body.classList.toggle('navigation-position-left', resolvedPosition === 'left');
    };

    applyNavigationPosition(localStorage.getItem(NAVIGATION_POSITION_STORAGE_KEY));

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NAVIGATION_POSITION_STORAGE_KEY) {
        applyNavigationPosition(event.newValue);
      }
    };

    const handleNavigationPositionChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ position?: NavigationPosition }>;
      applyNavigationPosition(customEvent.detail?.position ?? null);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(NAVIGATION_POSITION_EVENT, handleNavigationPositionChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(NAVIGATION_POSITION_EVENT, handleNavigationPositionChange as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleCommandMenuShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandMenuOpen(true);
      }
    };

    window.addEventListener('keydown', handleCommandMenuShortcut);
    return () => window.removeEventListener('keydown', handleCommandMenuShortcut);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('command-menu-open', isCommandMenuOpen);
    return () => {
      document.body.classList.remove('command-menu-open');
    };
  }, [isCommandMenuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const applyViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
    };

    applyViewport(mediaQuery.matches);

    const handleViewportChange = (event: MediaQueryListEvent) => {
      applyViewport(event.matches);
    };

    mediaQuery.addEventListener('change', handleViewportChange);

    return () => {
      mediaQuery.removeEventListener('change', handleViewportChange);
    };
  }, []);

  const mainNavItems = allNavItems.slice(0, 3);
  const drawerNavItems = allNavItems.slice(3, 5);



  const toggleDrawer = () => {
    setIsWidgetsPanelOpen(false);
    setIsDrawerOpen((prev) => !prev);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };


  const closeWidgetsPanel = () => {
    setIsWidgetsPanelOpen(false);
  };

  const bringWidgetToFront = (widgetId: WidgetId) => {
    widgetLayerCounterRef.current += 1;
    const nextLayer = widgetLayerCounterRef.current;
    setWidgetLayers((prev) => ({
      ...prev,
      [widgetId]: nextLayer,
    }));
  };

  const openCalculatorWidget = () => {
    bringWidgetToFront('calculator');
    setCalculatorWidgetState((prev) => {
      if (prev === 'closed') {
        requestAnimationFrame(() => setCalculatorWidgetState('open'));
        return 'entering';
      }
      return 'open';
    });
    setIsWidgetsPanelOpen(false);
  };

  const openCameraWidget = () => {
    bringWidgetToFront('camera');
    setCameraWidgetState((prev) => {
      if (prev === 'closed') {
        requestAnimationFrame(() => setCameraWidgetState('open'));
        return 'entering';
      }
      return 'open';
    });
    setIsWidgetsPanelOpen(false);
  };

  useEffect(() => {
    setBuiltinWidgets(getBuiltinWidgetsState());
    const handleBuiltinChange = () => setBuiltinWidgets(getBuiltinWidgetsState());
    window.addEventListener(BUILTIN_WIDGETS_EVENT, handleBuiltinChange);
    return () => window.removeEventListener(BUILTIN_WIDGETS_EVENT, handleBuiltinChange);
  }, []);

  const bringUserWidgetToFront = (widgetId: string) => {
    widgetLayerCounterRef.current += 1;
    const nextLayer = widgetLayerCounterRef.current;
    setUserWidgetLayers((prev) => ({ ...prev, [widgetId]: nextLayer }));
  };

  const openUserWidget = (widgetId: string) => {
    bringUserWidgetToFront(widgetId);
    setUserWidgetWindows((prev) => {
      const current = prev[widgetId] ?? 'closed';
      if (current === 'closed' || current === 'exiting') {
        requestAnimationFrame(() =>
          setUserWidgetWindows((next) => ({ ...next, [widgetId]: 'open' }))
        );
        return { ...prev, [widgetId]: 'entering' };
      }
      return { ...prev, [widgetId]: 'open' };
    });
    setIsWidgetsPanelOpen(false);
  };

  const closeUserWidget = (widgetId: string) => {
    setUserWidgetWindows((prev) => ({ ...prev, [widgetId]: 'exiting' }));
    window.setTimeout(() => {
      setUserWidgetWindows((prev) => {
        if (prev[widgetId] !== 'exiting') return prev;
        const next = { ...prev };
        delete next[widgetId];
        return next;
      });
    }, 250);
  };

  useEffect(() => {
    if (calculatorWidgetState !== 'exiting') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCalculatorWidgetState('closed');
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [calculatorWidgetState]);

  useEffect(() => {
    if (cameraWidgetState !== 'exiting') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCameraWidgetState('closed');
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cameraWidgetState]);

  useEffect(() => {
    if (!isWidgetsPanelOpen || !isLeftAnchoredWidgetsPanel || !widgetsTriggerRef.current) {
      return;
    }

    const updateWidgetsPanelPosition = () => {
      if (!widgetsTriggerRef.current) {
        return;
      }

      const rect = widgetsTriggerRef.current.getBoundingClientRect();
      setWidgetsPanelStyle({
        left: `${rect.right + 8}px`,
        top: `${rect.top + rect.height / 2}px`,
      });
    };

    updateWidgetsPanelPosition();

    window.addEventListener('resize', updateWidgetsPanelPosition);
    window.addEventListener('scroll', updateWidgetsPanelPosition, true);

    return () => {
      window.removeEventListener('resize', updateWidgetsPanelPosition);
      window.removeEventListener('scroll', updateWidgetsPanelPosition, true);
    };
  }, [isWidgetsPanelOpen, isLeftAnchoredWidgetsPanel]);

  const commandGroups: CommandGroup[] = useMemo(() => [
    {
      id: 'suggestions',
      label: 'Quick actions',
      commands: [
        { id: 'ask', label: 'Ask AI assistant', hint: 'Type any question', logo: 'AI', keywords: ['ask', 'chat', 'question', 'assistant'] },
        { id: 'calculator', label: 'Open calculator', hint: 'Widget', logo: '123', keywords: ['math', 'tool'] },
        { id: 'camera', label: 'Open camera', hint: 'Widget', logo: 'CAM', keywords: ['photo', 'tool'] },
        { id: 'widgets', label: 'Browse widgets', hint: 'Tools', logo: 'W', keywords: ['apps', 'tools'] },
      ],
    },
    ...(favorites.length > 0
      ? [{
          id: 'favorites',
          label: t('favorites.commandGroup'),
          commands: favorites.map((item) => ({
            id: `favorite:${encodeURIComponent(item.href)}`,
            label: item.title,
            hint: t(`favorites.kind.${item.kind}`),
            icon: <Icon data={getFavoriteKindIcon(item.kind as FavoriteKind)} size={18} />,
            keywords: [item.href, 'favorite', 'избранное'],
          })),
        }]
      : []),
    ...(debouncedBlogQuery.length >= 2
      ? [{
          id: 'blog-search',
          label: `Результаты поиска по блогу: «${debouncedBlogQuery}»`,
          commands: blogSearchResults.map((post) => ({
            id: `blog-post:${post.slug ?? post.id}`,
            label: post.title,
            hint: post.excerpt ?? 'Открыть публикацию',
            icon: <Icon data={BookOpen} size={18} />,
            keywords: [debouncedBlogQuery],
          })),
        }]
      : []),
    ...(searchableUserWidgets.length > 0
      ? [
          {
            id: 'user-widgets',
            label: 'Ваши виджеты',
            commands: searchableUserWidgets.map((widget) => ({
              id: `user-widget:${widget.id}`,
              label: widget.title,
              hint: widget.description ?? 'Пользовательский виджет',
              icon: <Icon data={Circles3Plus} size={18} />,
              keywords: [
                'widget',
                'виджет',
                widget.description ?? '',
                widget.author?.name ?? '',
                widget.author?.username ?? '',
                ...widget.permissions,
              ],
            })),
          },
        ]
      : []),
    {
      id: 'go-to',
      label: 'Go to',
      commands: [
        {
          id: 'favorites-page',
          label: t('favorites.goToPage'),
          icon: <Icon data={Star} size={18} />,
          keywords: ['/favorites', 'favorite', 'избранное'],
        },
        ...allNavItems.map((item) => ({
          id: item.id,
          label: item.label,
          icon: <Icon data={item.icon} size={18} />,
          keywords: [item.link],
        })),
      ],
    },
  ], [blogSearchResults, debouncedBlogQuery, favorites, searchableUserWidgets, t]);

  const runCommand = (id: string, query?: string) => {
    if (id.startsWith('favorite:')) {
      const href = decodeURIComponent(id.slice('favorite:'.length));
      router.push(href);
    } else if (id === 'favorites-page') {
      router.push('/favorites');
    } else if (id.startsWith('blog-post:')) {
      router.push(`/blog/${encodeURIComponent(id.slice('blog-post:'.length))}`);
    } else if (id === 'ask') {
      const prompt = query?.trim();
      router.push(prompt ? `/chat?prompt=${encodeURIComponent(prompt)}` : '/chat');
    } else if (id === 'calculator') openCalculatorWidget();
    else if (id === 'camera') openCameraWidget();
    else if (id === 'widgets') router.push('/widgets');
    else if (id.startsWith('user-widget:')) {
      openUserWidget(id.slice('user-widget:'.length));
    } else {
      const destination = allNavItems.find((item) => item.id === id);
      if (destination) router.push(destination.link);
    }
    setIsCommandMenuOpen(false);
  };

  return (
    <>
      <nav className={`navigation navigation--${navigationPosition} ${isChatRoute ? 'navigation--chat-route' : ''} ${editorMenu ? 'navigation--editor' : ''}`}>
        <div className="nav-container">
          <div className="nav-items">
            {editorMenu ? (
              <>
                <Button
                  view="flat"
                  size="xl"
                  type="button"
                  onClick={() => {
                    editorMenu.onCancel();
                  }}
                  aria-label="Back"
                >
                  <Icon data={ArrowLeft} size={20} />
                </Button>
                <Button
                  view="action"
                  size="xl"
                  onClick={editorMenu.onSave}
                  aria-label="Save"
                >
                  Save
                </Button>
                <Button
                  view="outlined"
                  size="xl"
                  onClick={editorMenu.onDraft}
                  aria-label="Draft"
                >
                  Draft
                </Button>
                <Button
                  view="flat"
                  size="xl"
                  onClick={editorMenu.onCancel}
                  aria-label="Cancel"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
            {mainNavItems.map((item) => (
              <Popover
                key={item.id}
                content={item.label}
                placement={navigationPosition === 'bottom' ? "top" : "left"}
                hasArrow
                openDelay={50}
                closeDelay={20}
                className='profile-popup'
              >
                <Button
                  view={activeItem === item.id ? "action" : "flat"}
                  selected={activeItem === item.id}
                  size="xl"
                  onClick={() => {
                    setActiveItem(item.id);
                    localStorage.setItem('activeItem', item.id);
                    if (item.link) {
                      router.push(item.link);
                    }
                  }}
                >
                  <Icon data={item.icon} size={20} />
                </Button>
              </Popover>
            ))}

            <Popover
              content="Commands (⌘K)"
              placement={navigationPosition === 'bottom' ? "top" : "left"}
              hasArrow
              openDelay={50}
              closeDelay={20}
              className='profile-popup'
            >
              <Button
                view={isCommandMenuOpen ? "action" : "flat"}
                selected={isCommandMenuOpen}
                size="xl"
                onClick={() => setIsCommandMenuOpen(true)}
                aria-label="Open command menu"
                aria-haspopup="dialog"
              >
                <Icon data={Magnifier} size={20} />
              </Button>
            </Popover>

            {(isMobileViewport || navigationPosition === 'bottom') && (
              <Popover
                content="Menu"
                placement="top"
                hasArrow
                openDelay={50}
                closeDelay={20}
                className='profile-popup'
              >
                <Button
                  view={isDrawerOpen ? "action" : "flat"}
                  selected={isDrawerOpen}
                  size="xl"
                  onClick={toggleDrawer}
                  aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
                  aria-expanded={isDrawerOpen}
                >
                  <Icon data={isDrawerOpen ? Xmark : Bars} size={20} />
                </Button>
              </Popover>
            )}
              </>
            )}
          </div>
          {!editorMenu && !isMobileViewport && navigationPosition !== 'bottom' && (
            <Popover
              content="Profile"
              placement="left"
              hasArrow
              openDelay={50}
              closeDelay={20}
              className='profile-popup'
            >
              <Link href="/auth/profile">
                <UserAvatar />
              </Link>
            </Popover>
          )}
        </div>
      </nav>

      {isCommandMenuOpen && (
        <div className="command-menu-dialog" role="dialog" aria-modal="true" aria-label="Command menu">
          <button
            type="button"
            className="command-menu-dialog__backdrop"
            onClick={() => setIsCommandMenuOpen(false)}
            aria-label="Close command menu"
          />
          <div className="command-menu-dialog__content">
            <CommandMenu
              autoFocus
              placeholder="Введите команду или задайте вопрос…"
              groups={commandGroups}
  onClose={() => {
    setIsCommandMenuOpen(false);
    setBlogSearchInput('');
  }}
  onQueryChange={setBlogSearchInput}
  onRun={runCommand}
            />
          </div>
        </div>
      )}

      <div
        className={`widgets-panel ${isLeftAnchoredWidgetsPanel ? 'widgets-panel--left' : ''} ${isBottomAnchoredWidgetsPanel ? 'widgets-panel--bottom' : ''} ${isWidgetsPanelOpen ? 'widgets-panel--open' : ''}`}
        style={isLeftAnchoredWidgetsPanel ? widgetsPanelStyle : undefined}
        role="dialog"
        aria-modal="false"
        aria-label="Widgets list"
      >
        <div className="widgets-panel__header">
          <Text variant="subheader-2">Widgets</Text>
        </div>
        <div className="widgets-panel__divider" />
        {builtinWidgets.calculator && (
          <button
            type="button"
            className="widgets-panel__item"
            onClick={openCalculatorWidget}
          >
            <Icon data={Calculator} size={18} />
            <Text variant="body-1">Calculator</Text>
          </button>
        )}
        {builtinWidgets.camera && (
          <button
            type="button"
            className="widgets-panel__item"
            onClick={openCameraWidget}
          >
            <Icon data={Camera} size={18} />
            <Text variant="body-1">Camera</Text>
          </button>
        )}
          {enabledUserWidgets.map((widget) => (
          <button
            key={widget.id}
            type="button"
            className="widgets-panel__item"
            onClick={() => openUserWidget(widget.id)}
          >
            <Icon data={Circles3Plus} size={18} />
            <Text variant="body-1" ellipsis>{widget.title}</Text>
          </button>
        ))}
        <div className="widgets-panel__divider" />
        <button
          type="button"
          className="widgets-panel__item"
          onClick={() => {
            setIsWidgetsPanelOpen(false);
            router.push('/widgets');
          }}
        >
          <Icon data={Gear} size={18} />
          <Text variant="body-1">{t('navigation.allWidgets')}</Text>
        </button>
      </div>
      <button
        type="button"
        className={`widgets-panel__overlay ${isWidgetsPanelOpen ? 'widgets-panel__overlay--open' : ''}`}
        onClick={closeWidgetsPanel}
        aria-label="Close widgets panel"
      />

      <DrawerMenu open={isDrawerOpen} onClose={closeDrawer} reserveTabBar>
        {drawerNavItems.map((item) => (
          <NavigationItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            size="l"
            isActive={activeItem === item.id}
            onClick={() => {
              setActiveItem(item.id);
              closeDrawer();
              localStorage.setItem('activeItem', item.id);
              if (item.link) {
                router.push(item.link);
              }
            }}
            showLabel
          />
        ))}
      </DrawerMenu>

      {calculatorWidgetState !== 'closed' && (
        <CalculatorPanel
          draggable
          zIndex={widgetLayers.calculator}
          onActivate={() => bringWidgetToFront('calculator')}
          onClose={() => setCalculatorWidgetState('exiting')}
          className={
            calculatorWidgetState === 'entering'
              ? 'calculator-panel--entering'
              : calculatorWidgetState === 'exiting'
                ? 'calculator-panel--exiting'
                : 'calculator-panel--open'
          }
        />
      )}
      {cameraWidgetState !== 'closed' && (
        <CameraPanel
          draggable
          zIndex={widgetLayers.camera}
          onActivate={() => bringWidgetToFront('camera')}
          onClose={() => setCameraWidgetState('exiting')}
          className={
            cameraWidgetState === 'entering'
              ? 'camera-panel--entering'
              : cameraWidgetState === 'exiting'
                ? 'camera-panel--exiting'
                : 'camera-panel--open'
          }
        />
      )}
      {searchableUserWidgets
        .filter((widget) => (userWidgetWindows[widget.id] ?? 'closed') !== 'closed')
        .map((widget) => {
          const windowState = userWidgetWindows[widget.id];
          return (
            <UserWidgetPanel
              key={widget.id}
              widget={widget}
              draggable
              zIndex={userWidgetLayers[widget.id]}
              onActivate={() => bringUserWidgetToFront(widget.id)}
              onClose={() => closeUserWidget(widget.id)}
              className={
                windowState === 'entering'
                  ? 'user-widget-panel--entering'
                  : windowState === 'exiting'
                    ? 'user-widget-panel--exiting'
                    : 'user-widget-panel--open'
              }
            />
          );
        })}
    </>
  );
};

export default Navigation;
