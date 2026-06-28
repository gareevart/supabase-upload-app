import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { ThemeProvider } from '@gravity-ui/uikit';
import { I18nProvider } from '@/app/contexts/I18nContext';

import '@/styles/styles.css';
import '@gravity-ui/uikit/styles/styles.css';
import './storybook.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'g-root_theme_light',
        dark: 'g-root_theme_dark',
      },
      defaultTheme: 'light',
      parentSelector: 'html',
    }),
    (Story, context) => {
      const theme = context.globals.theme === 'dark' ? 'dark' : 'light';

      return (
        <ThemeProvider theme={theme}>
          <I18nProvider>
            <div className="app-canvas" style={{ padding: '16px' }}>
              <Story />
            </div>
          </I18nProvider>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
