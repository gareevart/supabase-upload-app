/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize image loading
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
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

const path = require('path');
module.exports = nextConfig;