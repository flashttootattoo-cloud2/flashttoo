import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ahceiqyuusgxmzblhsdr.supabase.co' },
    ],
  },
}

export default nextConfig
