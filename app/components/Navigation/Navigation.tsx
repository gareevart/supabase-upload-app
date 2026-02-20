import React, { useState, useEffect, useRef } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { Icon, Button, Popover, Text } from '@gravity-ui/uikit';
import { House, Circles4Square, Person, Magnifier, BookOpen, Bars, Xmark, Circles3Plus, Calculator, Camera } from '@gravity-ui/icons';
import Image from 'next/image';
import UserAvatar from '../UserAvatar';
import NavigationItem from './NavigationItem';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { CalculatorPanel } from '@/features/calculator/ui';
import { CameraPanel } from '@/features/camera/ui';
import Link from 'next/link'
import './Navigation.css';
import { NAVIGATION_POSITION_EVENT, NAVIGATION_POSITION_STORAGE_KEY, NavigationPosition } from './navigationPosition';

type WidgetId = 'calculator' | 'camera';
type WidgetAnimationState = 'closed' | 'entering' | 'open' | 'exiting';

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const widgetsTriggerRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isWidgetsPanelOpen, setIsWidgetsPanelOpen] = useState(false);
  const [calculatorWidgetState, setCalculatorWidgetState] = useState<WidgetAnimationState>('closed');
  const [cameraWidgetState, setCameraWidgetState] = useState<WidgetAnimationState>('closed');
  const [widgetLayers, setWidgetLayers] = useState<Record<WidgetId, number>>({
    calculator: 70,
    camera: 71,
  });
  const widgetLayerCounterRef = useRef(71);
  const [widgetsPanelStyle, setWidgetsPanelStyle] = useState<React.CSSProperties>({});
  const [navigationPosition, setNavigationPosition] = useState<NavigationPosition>('left');
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const isLeftAnchoredWidgetsPanel = navigationPosition === 'left' && !isMobileViewport;
  const isBottomAnchoredWidgetsPanel = navigationPosition === 'bottom' || isMobileViewport;

  // Function to determine active item based on current path
  const getActiveItemFromPath = (pathname: string): string => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/blog')) return 'blog';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/broadcasts')) return 'broadcasts';
    if (pathname.startsWith('/subscribers')) return 'subscribers';
    if (pathname.startsWith('/auth/profile')) return ''; // No active item for profile page
    return 'home'; // default fallback
  };

  // Update active item when pathname changes
  useEffect(() => {
    const activeFromPath = getActiveItemFromPath(pathname || '');
    setActiveItem(activeFromPath);
    localStorage.setItem('activeItem', activeFromPath);
    setIsWidgetsPanelOpen(false);
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const applyNavigationPosition = (value: string | null) => {
      const resolvedPosition: NavigationPosition = value === 'bottom' ? 'bottom' : 'left';
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

  const allNavItems = [
    { id: 'home', icon: House, label: 'Home', link: '/' },
    { id: 'blog', icon: BookOpen, label: 'Blog', link: '/blog' },
    { id: 'projects', icon: Circles4Square, label: 'Projects', link: '/projects' },
    { id: 'search', icon: Magnifier, label: 'Search', link: '/search' },
    { id: 'profile', icon: Person, label: 'Profile', link: '/auth/profile' },
  ];

  const mainNavItems = allNavItems.slice(0, 3);
  const drawerNavItems = allNavItems.slice(3, 5);



  const toggleDrawer = () => {
    setIsWidgetsPanelOpen(false);
    setIsDrawerOpen((prev) => !prev);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const toggleWidgetsPanel = () => {
    setIsDrawerOpen(false);
    setIsWidgetsPanelOpen((prev) => !prev);
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

  return (
    <>
      <nav className={`navigation navigation--${navigationPosition}`}>
        <div className="nav-container">
          <div className="logo-area">
            <div className="logo-wrapper">
              <Link href="/">
                <Image
                  src={'/g-logo.svg'}
                  alt="Logo"
                  width={32}
                  height={32}
                  priority
                />
              </Link>
            </div>
          </div>

          <div className="nav-items">
            {mainNavItems.map((item) => (
              <Popover
                key={item.id}
                content={item.label}
                placement="top"
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

            <div ref={widgetsTriggerRef}>
              <Popover
                content="Widgets"
                placement={navigationPosition === 'bottom' ? "top" : "left"}
                hasArrow
                openDelay={50}
                closeDelay={20}
                className='profile-popup'
              >
                <Button
                  view={isWidgetsPanelOpen ? "action" : "flat"}
                  selected={isWidgetsPanelOpen}
                  size="xl"
                  onClick={toggleWidgetsPanel}
                  aria-label={isWidgetsPanelOpen ? "Close widgets panel" : "Open widgets panel"}
                  aria-expanded={isWidgetsPanelOpen}
                >
                  <Icon data={Circles3Plus} size={20} />
                </Button>
              </Popover>
            </div>

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
          </div>
          {!isMobileViewport && navigationPosition !== 'bottom' && (
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
        <button
          type="button"
          className="widgets-panel__item"
          onClick={openCalculatorWidget}
        >
          <Icon data={Calculator} size={18} />
          <Text variant="body-1">Calculator</Text>
        </button>
        <button
          type="button"
          className="widgets-panel__item"
          onClick={openCameraWidget}
        >
          <Icon data={Camera} size={18} />
          <Text variant="body-1">Camera</Text>
        </button>
      </div>
      <button
        type="button"
        className={`widgets-panel__overlay ${isWidgetsPanelOpen ? 'widgets-panel__overlay--open' : ''}`}
        onClick={closeWidgetsPanel}
        aria-label="Close widgets panel"
      />

      <DrawerMenu open={isDrawerOpen} onClose={closeDrawer} bottomOffset={navigationPosition === 'bottom' || isMobileViewport ? 81 : 65}>
        {drawerNavItems.map((item) => (
          <NavigationItem
            key={item.id}
            icon={item.icon}
            label={item.label}
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
    </>
  );
};

export default Navigation;
