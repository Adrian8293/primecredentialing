/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * FIX (BUG-2): Belt-and-suspenders redirect for /applications → /enrollments.
   * Primary fix is the Sidebar nav key change ('applications' → 'enrollments').
   * This redirect catches any hardcoded /applications links elsewhere in the app
   * or external links users may have bookmarked.
   */
  async redirects() {
    return [
      {
        source:      '/applications',
        destination: '/enrollments',
        permanent:   true,
      },
    ]
  },

  images: {
    domains: [
      't1.gstatic.com',
      'logo.clearbit.com',
      'icons.duckduckgo.com',
    ],
  },
}

module.exports = nextConfig
