"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Flex, Box } from '@gravity-ui/uikit';
import NavLink from './NavLink';
import ThemeToggle from './ThemeToggle';
import UserAvatar from '../UserAvatar';
import { mainNavItems } from './navConfig';
import styles from './Navigation.module.css';

interface NavBarProps {
  toggleTheme: (newTheme: boolean) => void;
  isDarkTheme: boolean;
}

export default function NavBar({ toggleTheme, isDarkTheme }: NavBarProps) {
  return (
    <Box className={styles.navBar}>
      <Flex alignItems="center" gap={3}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/g-logo.svg"
            alt="Gareev logo"
            width={32}
            height={32}
            priority
          />
        </Link>
        
        <Flex className={styles.navLinks}>
          {mainNavItems.map((item) => (
            <NavLink 
              key={item.href}
              href={item.href}
              label={item.label}
              exact={item.exact}
            />
          ))}
        </Flex>
      </Flex>

      <Flex className={styles.navSection}>
        <ThemeToggle 
          isDarkTheme={isDarkTheme} 
          toggleTheme={toggleTheme} 
        />
        
        <Link href="/auth/profile" className={styles.avatarWrapper}>
          <UserAvatar />
        </Link>
      </Flex>
    </Box>
  );
}