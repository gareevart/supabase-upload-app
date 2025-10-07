"use client"
import { Text, Link } from '@gravity-ui/uikit';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface CustomBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  segmentLabels?: Record<string, string>;
}

export default function CustomBreadcrumbs({ customItems, segmentLabels }: CustomBreadcrumbsProps) {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customItems) {
      return customItems;
    }

    const pathSegments = pathname?.split('/').filter(segment => segment !== '') || [];
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;
      
      // Используем кастомное название если есть, иначе капитализируем первую букву
      const label = segmentLabels?.[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath
      });
    });

    return breadcrumbs;
  };

  const items = generateBreadcrumbs();

  return (
    <nav aria-label="Breadcrumbs" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {item.href ? (
              <Link href={item.href} view="normal">
                <Text variant="body-1">{item.label}</Text>
              </Link>
            ) : (
              <Text variant="body-1" color="secondary">{item.label}</Text>
            )}
            {index < items.length - 1 && (
              <Text variant="body-1" color="hint">/</Text>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
