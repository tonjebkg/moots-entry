// next.config.mjs
import { withSentryConfig } from '@sentry/nextjs';

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
    ];
  },
};

// Only apply Sentry wrapper when DSN is configured
const sentryWebpackOptions = {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
};

export default process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackOptions)
  : nextConfig;
