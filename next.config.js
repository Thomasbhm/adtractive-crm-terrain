/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'minio.authomations.com',
      },
      {
        protocol: 'https',
        hostname: 'media.adtractive-group.fr',
      },
    ],
  },
}

module.exports = nextConfig
