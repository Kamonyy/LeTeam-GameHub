/** @type {import('next').NextConfig} */
const path = require('path');

const extraDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  output: 'export',
  trailingSlash: true,
  outputFileTracingRoot: path.join(__dirname),
  // LAN / device testing in dev (e.g. http://192.168.x.x:3000)
  allowedDevOrigins: [
    '192.168.68.101',
    '192.168.68.*',
    '192.168.*.*',
    '10.*.*.*',
    ...extraDevOrigins,
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ddragon.leagueoflegends.com',
        pathname: '/cdn/**/img/champion/**',
      },
      {
        protocol: 'https',
        hostname: 'raw.communitydragon.org',
        pathname: '/latest/plugins/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.join(__dirname, '../shared');
    return config;
  },
};

module.exports = nextConfig;
