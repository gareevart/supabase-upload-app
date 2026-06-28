import type { AnchorHTMLAttributes, ReactNode } from 'react';

type NextLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

export default function NextLink({ href, children, className, ...rest }: NextLinkProps) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}
