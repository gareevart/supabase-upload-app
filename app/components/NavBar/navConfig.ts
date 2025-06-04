export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export const mainNavItems: NavItem[] = [
  {
    href: '/',
    label: 'Home',
    exact: true
  },
  {
    href: '/blog',
    label: 'Blog',
    exact: true
  },
  {
    href: '/yaart',
    label: 'YaART',
    exact: true
  }
];