"use client"
import { Suspense } from 'react';
import { ProfileForm } from './ProfileForm';
import { ProfileLoading } from './ProfileLoading';
import { Text } from '@gravity-ui/uikit';

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Text variant="display-1">Profile</Text>
      <Suspense fallback={<ProfileLoading />}>
        <ProfileForm />
      </Suspense>
    </div>
  );
}
