/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL;

const nextConfig = {
  output: 'standalone', // ← tambahkan ini
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
