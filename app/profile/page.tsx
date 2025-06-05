"use client"
import { Suspense } from 'react';
import { ProfileForm } from './ProfileForm';
import { ProfileLoading } from './ProfileLoading';

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileForm />
      </Suspense>
    </div>
  );
}
