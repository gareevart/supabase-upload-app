import type { StorybookConfig } from '@storybook/react-vite';
import { loadEnv, mergeConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, '..');

const STORYBOOK_ENV_DEFAULTS = {
  NODE_ENV: 'development',
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'storybook-placeholder-anon-key',
} as const;

function buildProcessEnvDefine(mode: string) {
  const env = loadEnv(mode, projectRoot, '');

  const mergedEnv: Record<string, string> = {
    ...STORYBOOK_ENV_DEFAULTS,
    NODE_ENV: mode,
    ...Object.fromEntries(
      Object.entries(env).filter(([key]) => key.startsWith('NEXT_PUBLIC_')),
    ),
  };

  return Object.fromEntries(
    Object.entries(mergedEnv).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
  );
}

const config: StorybookConfig = {
  stories: [
    '../features/**/*.stories.@(ts|tsx)',
    '../shared/**/*.stories.@(ts|tsx)',
    '../widgets/**/*.stories.@(ts|tsx)',
  ],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: '@storybook/react-vite',
  async viteFinal(config, { configType }) {
    const mode = configType === 'PRODUCTION' ? 'production' : 'development';

    return mergeConfig(config, {
      define: buildProcessEnvDefine(mode),
      css: {
        postcss: {
          plugins: [],
        },
      },
      resolve: {
        alias: {
          '@': projectRoot,
        },
      },
    });
  },
};

export default config;
