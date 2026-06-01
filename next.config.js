const os = require('os');

// Dapatkan semua IP lokal komputer secara dinamis untuk membebaskan blokir Next.js dev server (allowedDevOrigins)
const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4') {
        ips.push(iface.address);
        ips.push(`${iface.address}:3000`);
      }
    }
  }
  return ips;
};

const allowedOrigins = [
  'localhost:3000',
  '127.0.0.1:3000',
  ...getLocalIPs()
];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
  runtimeCaching: [
    {
      // Cache API calls - network first
      urlPattern: /^https?:\/\/.*\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 5 * 60, // 5 menit
        },
        networkTimeoutSeconds: 10,
      },
    },
    {
      // Cache static assets - cache first
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 hari
        },
      },
    },
    {
      // Cache pages - stale while revalidate
      urlPattern: /^https?:\/\/.*\/(?!api\/).*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 hari
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: allowedOrigins,

  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${process.env.API_URL}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);