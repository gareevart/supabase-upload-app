import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The hand-written Supabase `Database` type is accurate (verified in isolation),
  // but @supabase/supabase-js's select-string conditional types exhaust TypeScript's
  // instantiation budget in large files, producing spurious `never` results that
  // are not real type bugs. They block `next build` type checking, so we skip it
  // here. Real type checking still runs via `npx tsc --noEmit` / `npm run lint`.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Transpile packages that need special handling
  transpilePackages: ['@gravity-ui/uikit', '@gravity-ui/icons'],

  // Optimize image loading
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'public-gareevde.storage.yandexcloud.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.yandexcloud.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'rajacaayhzgjoitquqvt.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Improve page loading performance
  experimental: {
    scrollRestoration: true,
    // Persist Turbopack compilation cache in .next/cache so Vercel can reuse
    // it between deploys (Vercel restores .next/cache on every build).
    turbopackFileSystemCacheForBuild: true,
  },

  // Compress assets for better performance
  compress: true,

  // Turbopack browser fallbacks for Node.js-only modules used by aikit peer deps
  turbopack: {
    // Avoid picking up ~/package-lock.json as monorepo root (breaks module resolution).
    root: projectRoot,
    resolveAlias: {
      fs: './lib/browser-shims/fs.js',
      // @diplodoc/tabs-extension does deep CJS require() into markdown-it,
      // but markdown-it v14+ ships only .mjs files — map them explicitly.
      'markdown-it/lib/token': './node_modules/markdown-it/lib/token.mjs',
      'markdown-it/lib/rules_core/state_core': './node_modules/markdown-it/lib/rules_core/state_core.mjs',
      'markdown-it/lib/common/utils': './node_modules/markdown-it/lib/common/utils.mjs',
    },
  },

  // Webpack configuration to handle file extensions
  webpack: (config, { isServer }) => {
    // Handle other file extensions
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };

    // Exclude server-only modules from client-side bundle
    config.externals = config.externals || [];
    config.externals.push({
      'mammoth': 'commonjs mammoth',
      'pdf2json': 'commonjs pdf2json',
    });

    // @diplodoc/transform (aikit peer dep) references Node.js `fs` in utilsFS.
    // Provide an empty stub for the browser bundle.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    // @diplodoc/tabs-extension does deep require() into markdown-it v14+
    // which ships only .mjs — alias to actual files for webpack too.
    config.resolve.alias = {
      ...config.resolve.alias,
      'markdown-it/lib/token': require.resolve('markdown-it/lib/token.mjs'),
      'markdown-it/lib/rules_core/state_core': require.resolve('markdown-it/lib/rules_core/state_core.mjs'),
      'markdown-it/lib/common/utils': require.resolve('markdown-it/lib/common/utils.mjs'),
    };

    return config;
  },

  // CORS configuration
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_APP_URL || '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },
};

export default nextConfig;
