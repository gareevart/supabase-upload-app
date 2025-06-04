import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
