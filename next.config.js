const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  
  // Configure path aliases
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
};

module.exports = nextConfig;
