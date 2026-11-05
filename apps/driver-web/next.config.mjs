/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    // The map, passenger list and trip list are now layers of the single driver screen.
    return ['/map', '/passengers', '/trips'].map((source) => ({
      source,
      destination: '/',
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        // The worker must be revalidated on every load so fixes roll out immediately.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
};
export default nextConfig;
