import React from 'react';
import BroadcastDetailClient from './BroadcastDetailClient';

// Define the page props type for Next.js 15
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Server component with async
export default async function BroadcastDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return <BroadcastDetailClient id={id} />;
}
