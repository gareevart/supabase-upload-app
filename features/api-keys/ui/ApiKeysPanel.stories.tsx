import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useEffect, useState } from 'react';
import type { AppLanguage } from '@/app/contexts/I18nContext';
import { useI18n } from '@/app/contexts/I18nContext';
import type { ApiKey, NewApiKey } from '../model/types';
import { ApiKeysPanel } from './ApiKeysPanel';
import type { ApiKeysPanelProps } from './ApiKeysPanel';

const mockApiKeys: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production',
    key_prefix: 'sk_a1b2c3d4',
    permissions: {},
    last_used_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    expires_at: null,
    is_active: true,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'key-2',
    name: 'CI pipeline',
    key_prefix: 'sk_f9e8d7c6',
    permissions: {},
    last_used_at: null,
    expires_at: null,
    is_active: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockNewKey: NewApiKey = {
  id: 'key-new',
  name: 'Staging',
  key_prefix: 'sk_newkey12',
  key: 'sk_newkey1234567890abcdef1234567890abcdef1234567890abcdef',
  permissions: {},
  last_used_at: null,
  expires_at: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const defaultHandlers = {
  onShowCreateModalChange: fn(),
  onNewKeyNameChange: fn(),
  onCreateKey: fn(),
  onCloseNewKey: fn(),
  onToggleShowNewKeyValue: fn(),
  onCopyKey: fn(),
  onToggleStatus: fn(),
  onDelete: fn(),
};

const meta = {
  title: 'Features/ApiKeys/ApiKeysPanel',
  component: ApiKeysPanel,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 900, maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    apiKeys: mockApiKeys,
    loading: false,
    creating: false,
    showCreateModal: false,
    newKeyName: '',
    showNewKey: false,
    newKeyData: null,
    showNewKeyValue: false,
    fullWidth: false,
    ...defaultHandlers,
  },
  argTypes: {
    loading: { control: 'boolean' },
    creating: { control: 'boolean' },
    showCreateModal: { control: 'boolean' },
    showNewKey: { control: 'boolean' },
    showNewKeyValue: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
} satisfies Meta<typeof ApiKeysPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveApiKeysPanel(
  args: ApiKeysPanelProps & { storyLanguage?: AppLanguage }
) {
  const { setLanguage, language } = useI18n();
  const [showCreateModal, setShowCreateModal] = useState(args.showCreateModal ?? false);
  const [newKeyName, setNewKeyName] = useState(args.newKeyName ?? '');
  const [showNewKey, setShowNewKey] = useState(args.showNewKey ?? false);
  const [showNewKeyValue, setShowNewKeyValue] = useState(args.showNewKeyValue ?? false);

  useEffect(() => {
    if (args.storyLanguage && args.storyLanguage !== language) {
      setLanguage(args.storyLanguage);
    }
  }, [args.storyLanguage, language, setLanguage]);

  useEffect(() => {
    setShowCreateModal(args.showCreateModal ?? false);
  }, [args.showCreateModal]);

  useEffect(() => {
    setNewKeyName(args.newKeyName ?? '');
  }, [args.newKeyName]);

  useEffect(() => {
    setShowNewKey(args.showNewKey ?? false);
  }, [args.showNewKey]);

  useEffect(() => {
    setShowNewKeyValue(args.showNewKeyValue ?? false);
  }, [args.showNewKeyValue]);

  return (
    <ApiKeysPanel
      {...args}
      showCreateModal={showCreateModal}
      onShowCreateModalChange={(open) => {
        setShowCreateModal(open);
        args.onShowCreateModalChange?.(open);
      }}
      newKeyName={newKeyName}
      onNewKeyNameChange={(value) => {
        setNewKeyName(value);
        args.onNewKeyNameChange?.(value);
      }}
      showNewKey={showNewKey}
      onCloseNewKey={() => {
        setShowNewKey(false);
        args.onCloseNewKey?.();
      }}
      showNewKeyValue={showNewKeyValue}
      onToggleShowNewKeyValue={() => {
        setShowNewKeyValue((value) => !value);
        args.onToggleShowNewKeyValue?.();
      }}
    />
  );
}

export const WithKeys: Story = {
  name: 'With keys',
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const Empty: Story = {
  args: {
    apiKeys: [],
  },
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const Loading: Story = {
  args: {
    loading: true,
    apiKeys: [],
  },
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const CreateModal: Story = {
  name: 'Create modal',
  args: {
    showCreateModal: true,
    newKeyName: 'My staging key',
  },
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const NewKeyModal: Story = {
  name: 'New key modal',
  args: {
    showNewKey: true,
    newKeyData: mockNewKey,
    showNewKeyValue: true,
  },
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const Russian: Story = {
  render: (args) => (
    <InteractiveApiKeysPanel {...args} storyLanguage="ru" />
  ),
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};

export const Playground: Story = {
  render: (args) => <InteractiveApiKeysPanel {...args} />,
};
