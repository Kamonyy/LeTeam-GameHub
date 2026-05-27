/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.alias['@shared'] = path.join(__dirname, '../shared');
    return config;
  },
};

module.exports = nextConfig;
