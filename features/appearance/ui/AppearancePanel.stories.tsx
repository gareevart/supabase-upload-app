import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { useI18n } from '@/app/contexts/I18nContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { AppearancePanel, AppearancePanelConnected } from './AppearancePanel';
import type { AppearancePanelProps } from './AppearancePanel';

const meta = {
  title: 'Features/Appearance/AppearancePanel',
  component: AppearancePanel,
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
  argTypes: {
    theme: {
      control: 'select',
      options: ['light', 'dark', 'system'],
    },
    language: {
      control: 'select',
      options: ['en', 'ru'],
    },
    navigation: {
      control: 'select',
      options: ['left', 'bottom'],
    },
  },
} satisfies Meta<typeof AppearancePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

function InteractiveAppearancePanel(args: AppearancePanelProps) {
  const { language, setLanguage } = useI18n();
  const [theme, setTheme] = useState(args.theme);
  const [navigation, setNavigation] = useState(args.navigation);

  useEffect(() => {
    setTheme(args.theme);
    setNavigation(args.navigation);
  }, [args.theme, args.navigation]);

  useEffect(() => {
    if (args.language !== language) {
      setLanguage(args.language);
    }
  }, [args.language, language, setLanguage]);

  return (
    <AppearancePanel
      {...args}
      theme={theme}
      language={language}
      navigation={navigation}
      onThemeChange={setTheme}
      onLanguageChange={setLanguage}
      onNavigationChange={setNavigation}
    />
  );
}

export const Default: Story = {
  args: {
    theme: 'light',
    language: 'en',
    navigation: 'left',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onNavigationChange: () => {},
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const DarkTheme: Story = {
  args: {
    ...Default.args,
    theme: 'dark',
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const SystemTheme: Story = {
  args: {
    ...Default.args,
    theme: 'system',
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const Russian: Story = {
  args: {
    ...Default.args,
    language: 'ru',
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const BottomNavigation: Story = {
  args: {
    ...Default.args,
    navigation: 'bottom',
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const AllAlternate: Story = {
  args: {
    theme: 'dark',
    language: 'ru',
    navigation: 'bottom',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onNavigationChange: () => {},
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const Playground: Story = {
  args: {
    theme: 'light',
    language: 'en',
    navigation: 'left',
    onThemeChange: () => {},
    onLanguageChange: () => {},
    onNavigationChange: () => {},
  },
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const Responsive: Story = {
  args: {
    ...Default.args,
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => <InteractiveAppearancePanel {...args} />,
};

export const Connected: Story = {
  render: () => (
    <AuthProvider>
      <AppearancePanelConnected />
    </AuthProvider>
  ),
};
