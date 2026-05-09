import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
  },

  // Compress assets for better performance
  compress: true,

  // Turbopack browser fallbacks for Node.js-only modules used by aikit peer deps
  turbopack: {
    resolveAlias: {
      fs: './lib/browser-shims/fs.js',
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
