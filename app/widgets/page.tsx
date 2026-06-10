import WidgetsPageClient from './WidgetsPageClient';

export default function WidgetsPage() {
  return <WidgetsPageClient />;
}

// Disable static generation and force client-side rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
