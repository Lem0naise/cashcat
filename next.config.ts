// Import the withPWA helper for Next.js PWA configuration
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Add disable: process.env.NODE_ENV === 'development' if you want to disable PWA in dev mode
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image Optimization configuration
  images: {
    domains: ["avatars.githubusercontent.com"],
  },

  // Asynchronous function to define redirects
  async redirects() {
    return [
      {
        source: '/:path*', // Matches any path (e.g., /, /terms, /learn, etc.)
        destination: 'https://cashcat.app/:path*', // Redirects to the www version, preserving the path
        permanent: true, // IMPORTANT: This is crucial for SEO (301 redirect)
        has: [ // Condition to ensure this redirect only fires for the non-www host
          {
            type: 'host',
            value: 'www.cashcat.app', // The host to redirect FROM (the non-www)
          },
        ],
      },
      // You can add other redirects here if needed in the future
    ];
  },

  // Any other Next.js configurations would go here.
  // For example:
  // reactStrictMode: true,
  // swcMinify: true,
  // output: 'standalone', // If using standalone output
};

// Export the combined configuration with PWA support
module.exports = withPWA(nextConfig);