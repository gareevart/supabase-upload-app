import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useState } from 'react';
import type { Profile } from '@/app/auth/profile/types';
import { ProfileEditForm } from '@/app/auth/profile/components/ProfileEditForm';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { AppearancePanel } from '@/features/appearance/ui/AppearancePanel';
import { UserProfileCard } from './UserProfileCard';

import '@/app/auth/Auth.css';
import '@/features/appearance/ui/AppearancePanel.css';

const mockProfile: Profile = {
  name: 'Dmitrii',
  username: 'gareev',
  avatar_url: 'https://placehold.co/160x160/png',
  bio: 'Я чем то занимаюсь и еще что то делаю. Ночами код пишу, по утрам дизайню. Делаю дела, иногда не делаю',
  website: 'https://gareev.de/changelog',
  theme: 'light',
  role: 'admin',
};

const mockEmail = 'gareev.da92@gmail.com';

const cardArgs = {
  email: mockEmail,
  onEdit: fn(),
  onLogout: fn(),
  fullWidth: true,
};

function InteractiveEditingCard({ initialProfile }: { initialProfile: Profile }) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);

  if (!profile) {
    return null;
  }

  return (
    <UserProfileCard
      {...cardArgs}
      profile={profile}
      isEditing
      editContent={
        <ProfileEditForm
          profile={profile}
          setProfile={setProfile}
          onSave={fn()}
          onCancel={fn()}
          isSaving={false}
        />
      }
    />
  );
}

const meta = {
  title: 'Features/UserProfile/UserProfileCard',
  component: UserProfileCard,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 592, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    profile: mockProfile,
    ...cardArgs,
    isEditing: false,
  },
} satisfies Meta<typeof UserProfileCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutOptionalFields: Story = {
  args: {
    profile: {
      name: null,
      username: null,
      avatar_url: null,
      bio: null,
      website: null,
      theme: null,
      role: null,
    },
    email: 'user@example.com',
  },
};

export const LongBio: Story = {
  args: {
    profile: {
      ...mockProfile,
      bio: `${mockProfile.bio} `.repeat(4).trim(),
    },
  },
};

export const Editing: Story = {
  decorators: [
    (Story) => (
      <AuthProvider>
        <div style={{ width: 592, maxWidth: '100%' }}>
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
  render: () => <InteractiveEditingCard initialProfile={mockProfile} />,
};

export const ProfileSectionStack: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--g-spacing-5, 20px)',
        width: 592,
        maxWidth: '100%',
      }}
    >
      <UserProfileCard profile={mockProfile} {...cardArgs} />
      <AppearancePanel
        theme="system"
        language="ru"
        navigation="bottom"
        onThemeChange={fn()}
        onLanguageChange={fn()}
        onNavigationChange={fn()}
        fullWidth
      />
    </div>
  ),
};

export const Responsive: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 360, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
};