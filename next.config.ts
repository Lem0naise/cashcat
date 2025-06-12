const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true
});

module.exports = withPWA({
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
  // other Next.js config
});
