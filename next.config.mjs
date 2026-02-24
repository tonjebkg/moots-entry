// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      // Redirect old setup URL to new seating tab
      {
        source: '/dashboard/events/:eventId/setup',
        destination: '/dashboard/:eventId/seating',
        permanent: true,
      },
      // Redirect old campaigns list URL to new campaigns tab
      {
        source: '/dashboard/events/:eventId/campaigns',
        destination: '/dashboard/:eventId/campaigns',
        permanent: true,
      },
      // Note: Campaign detail redirect requires campaign-to-event mapping
      // which cannot be done statically. Handle this in the campaigns tab
      // by parsing the query param if needed.
    ];
  },
};

export default nextConfig;
