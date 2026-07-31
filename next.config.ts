import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ahceiqyuusgxmzblhsdr.supabase.co' },
      { protocol: 'https', hostname: 'pub-bd0a5a9c111f492592c98d7f62e42036.r2.dev' },
    ],
  },
}

export default nextConfig
