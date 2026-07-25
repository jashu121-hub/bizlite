import type { NextConfig } from 'next'
import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/offline',
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next-pwa injects a webpack config; keep an empty turbopack block for Next 16 compatibility.
  turbopack: {},
}

export default withPWA(nextConfig)
