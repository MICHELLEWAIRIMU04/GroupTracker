/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    DATABASE_URL: process.env.DATABASE_URL
  }
}

module.exports = nextConfig