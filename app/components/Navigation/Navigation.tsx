import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon, Button } from '@gravity-ui/uikit';
import {House, Circles4Square, Person, Magnifier, BookOpen,  Bars } from '@gravity-ui/icons';
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

  // Function to determine active item based on current path
  const getActiveItemFromPath = (pathname: string): string => {
    if (pathname === '/') return 'home';
    if (pathname.startsWith('/blog')) return 'blog';
    if (pathname.startsWith('/projects')) return 'projects';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/auth/profile')) return ''; // No active item for profile page
    return 'home'; // default fallback
  };

  // Update active item when pathname changes
  useEffect(() => {
    const activeFromPath = getActiveItemFromPath(pathname);
    setActiveItem(activeFromPath);
    localStorage.setItem('activeItem', activeFromPath);
  }, [pathname]);

  const allNavItems = [
    { id: 'home', icon: House, label: 'Home', link: '/' },
    { id: 'blog', icon: BookOpen, label: 'Blog', link: '/blog' },
    { id: 'projects', icon: Circles4Square, label: 'Projects', link: '/projects' },
    { id: 'search', icon: Magnifier, label: 'Search', link: '/search' },
    { id: 'profile', icon: Person, label: 'Profile', link: '/auth/profile' },
  ];

  const mainNavItems = allNavItems.slice(0, 4);
  const drawerNavItems = allNavItems.slice(4);

  

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
                src="/g-logo.svg" 
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
              <Button
                key={item.id}
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
            ))}
            
            <Button
              view="flat"
              className="menu-button"
              onClick={toggleDrawer}
              aria-label="Open menu"
              aria-expanded={isDrawerOpen}
            >
               <Icon data={Bars} size={24} />
            </Button>
              <Link href="/auth/profile">
                <UserAvatar />
              </Link>
          </div>
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
