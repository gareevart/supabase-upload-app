import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import { AuthProvider } from '@/app/contexts/AuthContext';
import type { Profile } from '../types';
import { ProfileEditForm } from './ProfileEditForm';

import '@/features/appearance/ui/AppearancePanel.css';

const mockProfile: Profile = {
  name: 'Dmitrii',
  username: 'gareev',
  avatar_url: 'https://placehold.co/160x160/png',
  bio: 'Я чем то занимаюсь и еще что то делаю. Ночами код пишу, по утрам дизайню.',
  website: 'https://gareev.de/changelog',
  theme: 'light',
  role: 'admin',
};

function InteractiveProfileEditForm({
  initialProfile,
  isSaving = false,
}: {
  initialProfile: Profile;
  isSaving?: boolean;
}) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  if (!profile) {
    return null;
  }

  return (
    <ProfileEditForm
      profile={profile}
      setProfile={setProfile}
      onSave={fn()}
      onCancel={fn()}
      isSaving={isSaving}
    />
  );
}

const meta = {
  title: 'Auth/Profile/ProfileEditForm',
  component: ProfileEditForm,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <div
          className="appearance-panel appearance-panel--full-width"
          style={{ width: 592, maxWidth: '100%', boxSizing: 'border-box' }}
        >
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
} satisfies Meta<typeof ProfileEditForm>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <InteractiveProfileEditForm initialProfile={mockProfile} />,
};

export const Saving: Story = {
  render: () => <InteractiveProfileEditForm initialProfile={mockProfile} isSaving />,
};

export const MinimalFields: Story = {
  render: () => (
    <InteractiveProfileEditForm
      initialProfile={{
        name: null,
        username: null,
        avatar_url: null,
        bio: null,
        website: null,
        theme: null,
        role: null,
      }}
    />
  ),
};