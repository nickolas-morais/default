import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    // contratos e NFs em PDF podem passar de 1 MB
    serverActions: { bodySizeLimit: '10mb' },
    optimizePackageImports: ['@phosphor-icons/react'],
  },
}

export default nextConfig
