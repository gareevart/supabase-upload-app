import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AuthProvider } from '@/app/contexts/AuthContext';
import YandexFileUploader from './YandexFileUploader';

const meta = {
  title: 'Auth/YandexFileUploader',
  component: YandexFileUploader,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <div style={{ width: 480, maxWidth: '100%' }}>
          <Story />
        </div>
      </AuthProvider>
    ),
  ],
  args: {
    folderPath: 'profiles',
    acceptedFileTypes: 'image/*',
    maxSizeMB: 2,
    allowDelete: true,
    existingFileUrl: '',
    onUploadComplete: fn(),
    onDeleteComplete: fn(),
  },
} satisfies Meta<typeof YandexFileUploader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithExistingAvatar: Story = {
  args: {
    existingFileUrl: 'https://placehold.co/160x160/png',
  },
};