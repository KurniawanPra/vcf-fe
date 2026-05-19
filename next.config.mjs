/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://103.193.145.61:7777/:path*',
      },
    ];
  },
};

export default nextConfig;