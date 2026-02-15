import React, { useState, useEffect } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import { Icon, Button, Popover } from '@gravity-ui/uikit';
import { House, Circles4Square, Person, Magnifier, BookOpen, Bars, Xmark } from '@gravity-ui/icons';
import Image from 'next/image';
import UserAvatar from '../UserAvatar';
import NavigationItem from './NavigationItem';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import Link from 'next/link'
import './Navigation.css';
import { NAVIGATION_POSITION_EVENT, NAVIGATION_POSITION_STORAGE_KEY, NavigationPosition } from './navigationPosition';

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [navigationPosition, setNavigationPosition] = useState<NavigationPosition>('left');
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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
    setIsDrawerOpen((prev) => !prev);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

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
                placement="right"
                hasArrow
                openDelay={50}
                closeDelay={100}
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
              content="Menu"
              placement="bottom"
              hasArrow
              openDelay={50}
              closeDelay={100}
              className='profile-popup'
            >
              <Button
                view="flat"
                className="menu-button"
                onClick={toggleDrawer}
                aria-label={isDrawerOpen ? "Close menu" : "Open menu"}
                aria-expanded={isDrawerOpen}
              >
                <Icon data={isDrawerOpen ? Xmark : Bars} size={24} />
              </Button>
            </Popover>
          </div>
          <Popover
            content="Profile"
            placement="right"
            hasArrow
            openDelay={50}
            closeDelay={100}
            className='profile-popup'
          >
            <Link href="/auth/profile">
              <UserAvatar />
            </Link>
          </Popover>
        </div>
      </nav>

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
    </>
  );
};

export default Navigation;
