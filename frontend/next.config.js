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
};

module.exports = nextConfig;
