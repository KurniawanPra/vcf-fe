/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: `${process.env.PATH_URL}/:path*`,
        destination: 'http://103.193.145.61:7777/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;