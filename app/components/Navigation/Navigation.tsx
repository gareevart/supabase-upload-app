import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@gravity-ui/uikit';
import {House, Circles4Square, Person, Magnifier, BookmarkFill, Plus, Bars, MagicWand, Ghost} from '@gravity-ui/icons';
import Image from 'next/image';
import UserAvatar from '../UserAvatar';
import Link from 'next/link';
import NavigationItem from './NavigationItem';
import './Navigation.css';

const Navigation: React.FC = () => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeItem') || 'home';
    }
    return 'home';
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Check if we're on the profile page when the component mounts or the URL changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/auth/profile') {
        setActiveItem('profile');
        localStorage.setItem('activeItem', 'profile');
      }
    }
  }, []);

  const allNavItems = [
    { id: 'home', icon: House, label: 'Home', link: '/' },
    { id: 'projects', icon: Circles4Square, label: 'Projects', link: '/projects/uploader' },
    { id: 'yaart', icon: MagicWand, label: 'Image Generator', link: '/yaart' },
    { id: 'game', icon: Ghost, label: 'Memory Game', link: '/game' },
    { id: 'search', icon: Magnifier, label: 'Search', link: '/search' },
    { id: 'settings', icon: Plus, label: 'Settings', link: '/settings' },
    { id: 'profile', icon: Person, label: 'Profile', link: '/auth/profile' },
    { id: 'help', icon: Plus, label: 'Help', link: '/help' },
  ];

  const mainNavItems = allNavItems.slice(0, 5);
  const drawerNavItems = allNavItems.slice(5);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-container">
          <div className="logo-area">
            <div className="logo-wrapper">
              <Image 
                src="/g-logo.svg" 
                alt="Logo" 
                width={32} 
                height={32}
                priority
              />
            </div>
          </div>

          <div className="nav-items">
            {mainNavItems.map((item) => (
              <NavigationItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={activeItem === item.id}
                onClick={() => {
                  setActiveItem(item.id);
                  localStorage.setItem('activeItem', item.id);
                  if (item.link) {
                    router.push(item.link);
                  }
                }}
              />
            ))}
            
            <button
              className="menu-button"
              onClick={toggleDrawer}
              aria-label="Open menu"
              aria-expanded={isDrawerOpen}
            >
               <Icon data={Bars} size={24} />
            </button>
          <Link
            href="/auth/profile"
            className={`avatarWrapper nav-item ${activeItem === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setActiveItem('profile');
              localStorage.setItem('activeItem', 'profile');
            }}
          >
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
        </div>
        <div className="drawer-overlay" onClick={toggleDrawer} />
      </div>
    </>
  );
};

export default Navigation;
