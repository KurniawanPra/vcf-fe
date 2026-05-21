/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://103.193.145.61:7777/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;