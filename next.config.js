/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Remove appDir as it's no longer needed
  },
  // Remove swcMinify as it's enabled by default
}

module.exports = nextConfig 