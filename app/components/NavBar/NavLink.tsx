"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navigation.module.css';

interface NavLinkProps {
  href: string;
  label: string;
  exact?: boolean;
}

export default function NavLink({ href, label, exact = true }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = exact 
    ? pathname === href 
    : pathname.startsWith(href);

  return (
    <Link 
      href={href} 
      className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
    >
      {label}
    </Link>
  );
}