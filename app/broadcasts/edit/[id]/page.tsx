import React from 'react';
import EditBroadcastClient from './EditBroadcastClient';

// Define the page props type for Next.js 15
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Server component with async
export default async function EditBroadcastPage({ params }: PageProps) {
  const { id } = await params;
  
  return <EditBroadcastClient id={id} />;
}
