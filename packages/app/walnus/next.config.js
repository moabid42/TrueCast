const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@contracts'] = path.resolve(__dirname, '../../contracts');
    return config;
  },
};

module.exports = nextConfig; 