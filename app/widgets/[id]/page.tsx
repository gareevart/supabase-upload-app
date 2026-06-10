import WidgetViewPageClient from './WidgetViewPageClient';

export default async function WidgetViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WidgetViewPageClient widgetId={id} />;
}

// Disable static generation and force client-side rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
