import React, { useState, useEffect } from 'react';
export function switchLogo(eventName: string) {
  window.dispatchEvent(new CustomEvent('logoChange', { detail: eventName }));
}
import { useRouter, usePathname } from 'next/navigation';
import { Icon, Button, Popover } from '@gravity-ui/uikit';
import { House, Circles4Square, Person, Magnifier, BookOpen, Envelope, Bars } from '@gravity-ui/icons';
import Image from 'next/image';
import UserAvatar from '../UserAvatar';
import NavigationItem from './NavigationItem';
import { ThemeToggle } from './ThemeToggle';
import Link from 'next/link'
import './Navigation.css';

const Navigation: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // State for logo source, default to regular logo
  const [logoSrc, setLogoSrc] = useState('/g-logo-halloween.svg');
  const [isHover, setIsHover] = useState(false);

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

  // Listen for custom logo change events
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<string>;
      const eventName = custom.detail;
      if (eventName === 'halloween') {
        setLogoSrc('/g-logo-halloween.svg');
      } else {
        setLogoSrc('/g-logo.svg');
      }
    };
    window.addEventListener('logoChange', handler);
    return () => {
      window.removeEventListener('logoChange', handler);
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
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-container">
          <div className="logo-area">
            <div className="logo-wrapper">
              <Link href="/">
                <Image
                  src={logoSrc === '/g-logo-halloween.svg' && isHover ? '/pumpkin_halloween-logo.svg' : logoSrc}
                  alt="Logo"
                  width={32}
                  height={32}
                  priority
                  onDoubleClick={() => setLogoSrc(prev => prev === '/g-logo-halloween.svg' ? '/g-logo.svg' : '/g-logo-halloween.svg')}
                  onMouseEnter={() => setIsHover(true)}
                  onMouseLeave={() => setIsHover(false)}
                  style={{ transition: 'opacity 0.3s ease' }}
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
                aria-label="Open menu"
                aria-expanded={isDrawerOpen}
              >
                <Icon data={Bars} size={24} />
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

      {/* Drawer Menu */}
      <div className={`drawer-menu ${isDrawerOpen ? 'open' : ''}`}>
        <div className="drawer-content">
          {drawerNavItems.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeItem === item.id}
              onClick={() => {
                setActiveItem(item.id);
                setIsDrawerOpen(false);
                localStorage.setItem('activeItem', item.id);
                if (item.link) {
                  router.push(item.link);
                }
              }}
              showLabel
            />
          ))}

          <div className="drawer-theme-toggle">
            <ThemeToggle />
          </div>
        </div>
        <div className="drawer-overlay" onClick={toggleDrawer} />
      </div>
    </>
  );
};

export default Navigation;
