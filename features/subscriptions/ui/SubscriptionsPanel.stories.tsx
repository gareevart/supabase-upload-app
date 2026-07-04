import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { useEffect, useState } from 'react';
import type { AppLanguage } from '@/app/contexts/I18nContext';
import { useI18n } from '@/app/contexts/I18nContext';
import { SubscriptionsPanel } from './SubscriptionsPanel';
import type { SubscriptionsPanelProps } from './SubscriptionsPanel';

const meta = {
  title: 'Features/Subscriptions/SubscriptionsPanel',
  component: SubscriptionsPanel,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 600 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    emailSubscribed: true,
    emailLoading: false,
    onEmailSubscriptionChange: fn(),
    fullWidth: false,
  },
  argTypes: {
    emailSubscribed: {
      control: 'boolean',
    },
    emailLoading: {
      control: 'boolean',
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof SubscriptionsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveSubscriptionsPanel(args: SubscriptionsPanelProps & { storyLanguage?: AppLanguage }) {
  const { setLanguage, language } = useI18n();
  const [emailSubscribed, setEmailSubscribed] = useState(args.emailSubscribed);

  useEffect(() => {
    if (args.storyLanguage && args.storyLanguage !== language) {
      setLanguage(args.storyLanguage);
    }
  }, [args.storyLanguage, language, setLanguage]);

  useEffect(() => {
    setEmailSubscribed(args.emailSubscribed);
  }, [args.emailSubscribed]);

  return (
    <SubscriptionsPanel
      {...args}
      emailSubscribed={emailSubscribed}
      onEmailSubscriptionChange={(enabled) => {
        setEmailSubscribed(enabled);
        args.onEmailSubscriptionChange(enabled);
      }}
    />
  );
}

export const Default: Story = {
  render: (args) => <InteractiveSubscriptionsPanel {...args} />,
};

export const NotSubscribed: Story = {
  args: {
    emailSubscribed: false,
  },
  render: (args) => <InteractiveSubscriptionsPanel {...args} />,
};

export const Loading: Story = {
  args: {
    emailLoading: true,
  },
  render: (args) => <InteractiveSubscriptionsPanel {...args} />,
};

export const Russian: Story = {
  args: {
    storyLanguage: 'ru',
  } as SubscriptionsPanelProps & { storyLanguage?: AppLanguage },
  render: (args) => (
    <InteractiveSubscriptionsPanel {...args} storyLanguage="ru" />
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
  render: (args) => <InteractiveSubscriptionsPanel {...args} />,
};

export const Playground: Story = {
  render: (args) => <InteractiveSubscriptionsPanel {...args} />,
};
