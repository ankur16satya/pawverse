/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,

  // Issue 2.3: Enforce canonical www → non-www redirect
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.pawversesocial.com' }],
        destination: 'https://pawversesocial.com/:path*',
        permanent: true, // 301 redirect
      },
    ]
  },

  // Issue 3.3: Block non-content paths from being server-rendered
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },

  images: {
    domains: ['dhqeqowrtyuthjustclr.supabase.co', 'res.cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 86400,
  },
}

module.exports = nextConfig
