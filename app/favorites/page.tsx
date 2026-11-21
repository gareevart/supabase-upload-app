'use client';

import { redirect } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { FavoritesListWidget } from '@/widgets/favorites-list';

export default function FavoritesPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    redirect('/auth');
    return null;
  }

  return <FavoritesListWidget />;
}