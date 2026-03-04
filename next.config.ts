import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/pipeline-simulator',
  images: { unoptimized: true },
}

export default nextConfig
