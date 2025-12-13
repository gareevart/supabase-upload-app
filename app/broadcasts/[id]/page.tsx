import BroadcastDetailPageClient from './BroadcastDetailPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BroadcastDetailPage({ params }: PageProps) {
  // Разворачиваем params, чтобы избежать ошибки перечисления
  await params;
  return <BroadcastDetailPageClient />;
}

// Disable static generation and force client-side rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'edge';
export const fetchCache = 'force-no-store';
