import Image from 'next/image';
import { Text } from '@gravity-ui/uikit';
import './BrandLockup.css';

type BrandLockupProps = {
  name: string;
  role: string;
  className?: string;
};

export function BrandLockup({ name, role, className }: BrandLockupProps) {
  const rootClassName = className ? `brand-lockup ${className}` : 'brand-lockup';

  return (
    <div className={rootClassName}>
      <span className="brand-lockup__logo">
        <Image src="/g-logo.svg" alt={name} width={36} height={36} priority />
      </span>
      <span className="brand-lockup__meta">
        <span className="brand-lockup__name">{name}</span>
        <Text className="brand-lockup__role" color="secondary" variant="body-1">
          {role}
        </Text>
      </span>
    </div>
  );
}
