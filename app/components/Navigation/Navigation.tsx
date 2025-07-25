import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, DropdownMenu } from '@gravity-ui/uikit';
import {House, Circles4Square, Person, Magnifier, BookOpen,  Bars } from '@gravity-ui/icons';
import Image from 'next/image';
import UserAvatar from '../UserAvatar';
import NavigationItem from './NavigationItem';
import { ThemeToggle } from './ThemeToggle';
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
            
            <ThemeToggle />
            
            <DropdownMenu
              renderSwitcher={(props) => (
                <div
                  {...props}
                  className={`avatarWrapper nav-item ${activeItem === 'profile' ? 'active' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  <UserAvatar />
                </div>
              )}
              items={[
                {
                  iconStart: <Icon size={16} data={Person} />,
                  action: () => {
                    setActiveItem('profile');
                    localStorage.setItem('activeItem', 'profile');
                    router.push('/auth/profile');
                  },
                  text: 'Profile',
                },
              ]}
            />
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
