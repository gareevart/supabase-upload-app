import BroadcastsPageClient from './BroadcastsPageClient';

export default function BroadcastsPage() {
  return <BroadcastsPageClient />;
}

// Disable static generation and force client-side rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';
export const fetchCache = 'force-no-store';