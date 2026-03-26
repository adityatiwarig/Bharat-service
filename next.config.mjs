/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  experimental: {
    workerThreads: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
